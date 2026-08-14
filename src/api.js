import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = async () => {
  const url = await AsyncStorage.getItem('erp_url');
  return url ? url.replace(/\/$/, "") : 'http://server.royal.co.tz:8092';
};

// ---------------------------------------------------------------------------
// SESSION LIFECYCLE
// ---------------------------------------------------------------------------
// ERPNext session cookies (sid) expire server-side. Previously the app stored
// the sid forever, never checked HTTP status codes, and React Native's
// persistent NATIVE cookie jar kept re-sending stale cookies until the app was
// uninstalled. Fixes:
//   1. credentials: 'omit' on every fetch -> the native cookie jar is bypassed
//      entirely; ONLY the sid we explicitly manage in AsyncStorage is sent.
//   2. authFetch detects 401/403 AuthenticationError -> clears the dead sid
//      and notifies App.js so the user is routed back to the Login screen.
//   3. validateSession() lets the Login screen verify the sid with the server
//      instead of blindly trusting that one exists.
// ---------------------------------------------------------------------------

let onSessionExpired = null;
let sessionExpiredNotified = false;

// App.js registers a callback that navigates the user back to Login.
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['erp_sid', 'erp_user']);
};

const handleAuthFailure = async () => {
  console.log('[AUTH]: Session rejected by server (expired/invalid). Clearing stored session.');
  await clearSession();
  if (!sessionExpiredNotified && onSessionExpired) {
    sessionExpiredNotified = true; // fire once, not for every queued request
    onSessionExpired();
  }
};

// Frappe signals auth problems in several ways; check them all.
const isAuthErrorResponse = (status, bodyText) => {
  if (status !== 401 && status !== 403) return false;
  if (status === 401) return true;
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed.session_expired) return true;
    const excType = parsed.exc_type || '';
    if (excType.indexOf('AuthenticationError') !== -1) return true;
    if (excType.indexOf('CSRFTokenError') !== -1) return true;
    const asText = bodyText || '';
    return asText.indexOf('AuthenticationError') !== -1 || asText.indexOf('session_expired') !== -1;
  } catch (e) {
    return true; // 403 with unparseable body -> treat as auth failure
  }
};

// Cheap server-side check of whether the stored sid is still alive.
// Returns { valid, user } or { valid: false, offlineOk } when the server
// simply cannot be reached (so offline usage stays possible).
export const validateSession = async () => {
  const sid = await AsyncStorage.getItem('erp_sid');
  if (!sid) return { valid: false, reason: 'no_session' };
  const baseUrl = await getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Cookie': `sid=${sid}` },
      credentials: 'omit'
    });
    if (response.ok) {
      const data = await response.json();
      if (data.message && data.message !== 'Guest') {
        console.log(`[AUTH]: Session check OK. Logged in as ${data.message}`);
        return { valid: true, user: data.message };
      }
      console.log('[AUTH]: Session check returned Guest. Session is dead.');
      await clearSession();
      return { valid: false, reason: 'expired' };
    }
    if (response.status === 401 || response.status === 403) {
      console.log(`[AUTH]: Session check rejected (HTTP ${response.status}).`);
      await clearSession();
      return { valid: false, reason: 'expired' };
    }
    // Server up but misbehaving (5xx etc.) - don't punish the user.
    return { valid: false, reason: 'server_error', offlineOk: true };
  } catch (e) {
    // Network unreachable - allow offline continuation.
    console.log(`[AUTH]: Session check skipped (offline): ${e.message}`);
    return { valid: false, reason: 'network', offlineOk: true };
  }
};

export const logoutFromERP = async () => {
  try {
    await authFetch('/api/method/logout', 'POST');
  } catch (e) {}
  await clearSession();
};

export const loginToERP = async (email, password) => {
  const baseUrl = await getBaseUrl();
  console.log(`[AUTH]: Attempting login to ${baseUrl} for ${email}`);
  try {
    const response = await fetch(`${baseUrl}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ usr: email, pwd: password }),
      credentials: 'omit' // keep RN's native cookie jar out of the picture
    });
    const data = await response.json();
    if (response.ok && data.message === "Logged In") {
      const cookieStr = response.headers.get('set-cookie');
      let sid = '';
      if (cookieStr) {
        const match = cookieStr.match(/sid=([^;]+)/);
        if (match) sid = match[1];
      }
      if (!sid) {
        console.log('[AUTH]: Login OK but no sid cookie received.');
        return { success: false, error: 'Server did not return a session. Contact administrator.' };
      }
      await AsyncStorage.setItem('erp_sid', sid);
      await AsyncStorage.setItem('erp_user', data.full_name);
      await AsyncStorage.setItem('erp_url', baseUrl);
      sessionExpiredNotified = false; // fresh session -> re-arm the expiry handler
      console.log(`[AUTH]: Login successful. Session SID initialized.`);
      return { success: true, user: data.full_name };
    } else {
      console.log(`[AUTH]: Credentials rejected by server: ${data.message}`);
      return { success: false, error: data.message || 'Invalid Credentials' };
    }
  } catch (error) {
    console.log(`[AUTH]: Network error during authentication: ${error.message}`);
    return { success: false, error: 'Cannot reach server.' };
  }
};

export const authFetch = async (endpoint, method = 'GET', body = null) => {
  const baseUrl = await getBaseUrl();
  const sid = await AsyncStorage.getItem('erp_sid');
  const headers = { 
    'Content-Type': 'application/json', 
    'Accept': 'application/json'
  };
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  // credentials:'omit' prevents React Native's persistent native cookie store
  // from silently attaching/overriding cookies. Without this, a stale sid kept
  // being sent until the app was uninstalled.
  const config = { method, headers, credentials: 'omit' };
  if (body) config.body = JSON.stringify(body);

  console.log(`[API REQUEST]: ${method} -> ${endpoint}`);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    const text = await response.text();
    console.log(`[API RESPONSE]: Code ${response.status}`);

    // Detect expired/invalid session and recover instead of failing silently.
    if (isAuthErrorResponse(response.status, text)) {
      await handleAuthFailure();
      return { success: false, error: 'Session expired. Please log in again.', sessionExpired: true };
    }

    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.log(`[API ERROR]: Non-JSON response (HTTP ${response.status}) from ${endpoint}`);
      return { success: false, error: `Unexpected server response (HTTP ${response.status})` };
    }
  } catch (e) {
    console.log(`[API ERROR]: Failure requesting ${endpoint}: ${e.message}`);
    return { success: false, error: e.message };
  }
};

export const pushLiveClient = async (clientData) => {
  console.log(`[SYNC-CLIENT]: Initiating live sync for Lead: ${clientData.name}`);
  try {
    const payload = {
      name: clientData.name, 
      phone: clientData.phone,
      lat: clientData.lat, 
      lng: clientData.lng,
      businessType: clientData.businessType,
      contactRole: clientData.contactRole,
      ownerPhone: clientData.ownerPhone,
      notes: clientData.notes,
      photosBase64: clientData.photosBase64 || []
    };
    const res = await authFetch('/api/method/sfa_crm.api.sync_client', 'POST', { payload: JSON.stringify(payload) });
    if (res.message && res.message.success) {
      console.log(`[SYNC-CLIENT]: Live sync successful. Allocated ID: ${res.message.name}`);
      return { success: true, erpName: res.message.name };
    }
    console.log(`[SYNC-CLIENT]: Rejected by server: ${JSON.stringify(res)}`);
    return { success: false, error: res.message?.error || 'Unknown Error' };
  } catch (e) {
    console.log(`[SYNC-CLIENT]: Network exception: ${e.message}`);
    return { success: false, error: e.message };
  }
};

export const pushLiveOrder = async (orderData) => {
  console.log(`[SYNC-ORDER]: Initiating live sync for customer: ${orderData.clientName}`);
  try {
    const erpDoctype = orderData.type === 'Quotation' ? 'Quotation' : 'Sales Order';
    const itemsPayload = orderData.items.map(i => ({ 
      item_code: i.id, 
      item_name: i.name, 
      qty: i.qty, 
      rate: i.price 
    }));
    const payload = { 
      customer: orderData.clientName, 
      delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      items: itemsPayload 
    };
    const res = await authFetch(`/api/method/sfa_crm.api.sync_order`, 'POST', { doc_type: erpDoctype, payload: JSON.stringify(payload) });
    if (res.message && res.message.success) {
      console.log(`[SYNC-ORDER]: Order sync completed. Document Ref: ${res.message.name}`);
      return { success: true, erpName: res.message.name };
    }
    console.log(`[SYNC-ORDER]: Rejected by server: ${JSON.stringify(res)}`);
    return { success: false, error: res.message?.error || 'Unknown Error' };
  } catch (e) {
    console.log(`[SYNC-ORDER]: Network exception: ${e.message}`);
    return { success: false, error: e.message };
  }
};

export const pushLiveVisit = async (visitData) => {
  console.log(`[SYNC-VISIT]: Initiating live check-in sync for customer: ${visitData.customer}`);
  try {
    const payload = {
      customer: visitData.customer, 
      start_time: visitData.start_time, 
      end_time: visitData.end_time,
      outcome: visitData.outcome, 
      no_order_reason: visitData.no_order_reason || '',
      lat: visitData.lat, 
      lng: visitData.lng, 
      photoBase64: visitData.photoBase64 || null
    };
    const res = await authFetch(`/api/method/sfa_crm.api.sync_visit`, 'POST', { payload: JSON.stringify(payload) });
    if (res.message && res.message.success) {
      console.log(`[SYNC-VISIT]: Visit log saved. Ref ID: ${res.message.name}`);
      return { success: true, erpName: res.message.name };
    }
    console.log(`[SYNC-VISIT]: Rejected by server: ${JSON.stringify(res)}`);
    return { success: false, error: res.message?.error || 'Unknown' };
  } catch (e) {
    console.log(`[SYNC-VISIT]: Network exception: ${e.message}`);
    return { success: false, error: e.message };
  }
};

export const pullMasterData = async () => {
  console.log("[PULL-MASTER]: Starting full database update...");
  try {
    const settings = await authFetch('/api/method/sfa_crm.api.get_sfa_settings');
    if (settings && settings.message) {
      await AsyncStorage.setItem('sfaSettings', JSON.stringify(settings.message));
    }

    const itemsRes = await authFetch('/api/resource/Item?fields=["name","item_name"]&limit_page_length=500');
    const pricesRes = await authFetch('/api/resource/Item Price?fields=["item_code","price_list_rate"]&filters=[["selling","=",1]]&limit_page_length=500');
    
    if (itemsRes && itemsRes.data) {
      const prices = pricesRes.data || [];
      const formattedItems = itemsRes.data.map(i => {
        const pObj = prices.find(p => p.item_code === i.name);
        return { id: i.name, name: i.item_name, price: pObj ? pObj.price_list_rate : 0 };
      });
      await AsyncStorage.setItem('offlineItems', JSON.stringify(formattedItems));
      console.log(`[PULL-MASTER]: Synced ${formattedItems.length} items with prices.`);
    }

    const custRes = await authFetch('/api/resource/Customer?fields=["name","customer_name","custom_latitude","custom_longitude","image","mobile_no","custom_business_type"]&limit_page_length=500');
    const leadRes = await authFetch('/api/resource/Lead?fields=["name","lead_name","image","mobile_no","custom_business_type"]&filters=[["status","!=","Converted"]]&limit_page_length=500');

    let allClients = [];
    if (custRes && custRes.data) {
      allClients = [...allClients, ...custRes.data.map(c => ({ ...c, isLead: false }))];
    }
    if (leadRes && leadRes.data) {
      allClients = [...allClients, ...leadRes.data.map(l => ({ 
        name: l.name, 
        customer_name: l.lead_name, 
        image: l.image, 
        mobile_no: l.mobile_no, 
        custom_business_type: l.custom_business_type,
        isLead: true 
      }))];
    }

    const baseUrl = await getBaseUrl();
    const formattedCusts = allClients.map(c => ({
      id: c.name, 
      name: c.customer_name,
      lat: c.custom_latitude ? parseFloat(c.custom_latitude) : null,
      lng: c.custom_longitude ? parseFloat(c.custom_longitude) : null,
      image: c.image ? `${baseUrl}${c.image}` : null,
      phone: c.mobile_no || 'No Phone', 
      businessType: c.custom_business_type || 'Unknown Type', 
      status: 'Synced',
      isLead: c.isLead
    }));

    await AsyncStorage.setItem('offlineClients', JSON.stringify(formattedCusts));
    console.log(`[PULL-MASTER]: Completed. Loaded ${formattedCusts.length} total customer targets.`);
    return { success: true };
  } catch (error) {
    console.log(`[PULL-MASTER]: Sync error encountered: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const syncAllDataToERP = async () => {
  console.log("[BATCH-SYNC]: Starting bulk synchronization...");
  try {
    let existingClients = await AsyncStorage.getItem('offlineClients');
    let clients = existingClients ? JSON.parse(existingClients) : [];
    let idMap = {};

    // 1. Sync Offline Clients (KYC Leads)
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].status === 'Pending Sync') {
        let res = await pushLiveClient(clients[i]);
        if (res.success) {
          idMap[clients[i].id] = res.erpName;
          clients[i].status = 'Synced';
          clients[i].id = res.erpName;
        }
      }
    }
    await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));

    // 2. Sync Offline Orders
    let existingOrders = await AsyncStorage.getItem('offlineOrders');
    let orders = existingOrders ? JSON.parse(existingOrders) : [];
    for (let o of orders) {
      if (o.status === 'Pending Sync') {
        if (idMap[o.clientName]) {
          o.clientName = idMap[o.clientName];
        }
        let res = await pushLiveOrder(o);
        if (res.success) { 
          o.status = 'Synced'; 
          o.erpName = res.erpName; 
        }
      }
    }
    await AsyncStorage.setItem('offlineOrders', JSON.stringify(orders));

    // 3. Sync Offline Visits
    let existingVisits = await AsyncStorage.getItem('offlineVisits');
    let visits = existingVisits ? JSON.parse(existingVisits) : [];
    for (let v of visits) {
      if (v.status === 'Pending Sync') {
        if (idMap[v.customer]) {
          v.customer = idMap[v.customer];
        }
        let res = await pushLiveVisit(v);
        if (res.success) { 
          v.status = 'Synced'; 
        }
      }
    }
    await AsyncStorage.setItem('offlineVisits', JSON.stringify(visits));
    console.log("[BATCH-SYNC]: Bulk synchronization finished cleanly.");
    return { success: true };
  } catch (e) {
    console.log(`[BATCH-SYNC]: Sync interrupted: ${e.message}`);
    return { success: false, error: e.message };
  }
};
