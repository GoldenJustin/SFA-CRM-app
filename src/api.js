import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const getBaseUrl = async () => {
  const url = await AsyncStorage.getItem('erp_url');
  return url ? url.replace(/\/$/, "") : 'http://server.royal.co.tz:8092';
};

// ---------------------------------------------------------------------------
// PERMANENT LOGIN STRATEGY (user stays logged in until they press Logout)
// ---------------------------------------------------------------------------
//  Layer 1 - TOKEN AUTH (primary): after login the app fetches the user's
//    api_key:api_secret from the sfa_crm app and sends
//    "Authorization: token key:secret" on every request. Tokens never expire.
//    (Requires the small get_api_token method on the ERPNext side - see
//    ERPNEXT_TOKEN_SETUP.md. If the server does not have it yet, the app
//    automatically falls back to Layer 2.)
//  Layer 2 - SILENT RE-LOGIN (fallback): credentials are stored encrypted in
//    the device Keystore (expo-secure-store). When the sid session expires,
//    the app silently logs in again in the background and retries the failed
//    request - the user never sees the Login screen.
//  Layer 3 - LAST RESORT: only if silent re-login itself fails (e.g. the
//    password was changed in ERPNext) is the user sent back to Login.
// ---------------------------------------------------------------------------

const KEY_TOKEN = 'erp_api_token';
const KEY_EMAIL = 'erp_saved_email';
const KEY_PASSWORD = 'erp_saved_password';

let onSessionExpired = null;
let sessionExpiredNotified = false;

// App.js registers a callback that navigates the user back to Login.
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['erp_sid', 'erp_user']);
};

// --- Encrypted credential vault (Android Keystore / iOS Keychain) ----------
const saveCredentials = async (email, password) => {
  try {
    await SecureStore.setItemAsync(KEY_EMAIL, email);
    await SecureStore.setItemAsync(KEY_PASSWORD, password);
  } catch (e) {
    console.log(`[VAULT]: Could not store credentials securely: ${e.message}`);
  }
};

const getCredentials = async () => {
  try {
    const email = await SecureStore.getItemAsync(KEY_EMAIL);
    const password = await SecureStore.getItemAsync(KEY_PASSWORD);
    if (email && password) return { email, password };
  } catch (e) {}
  return null;
};

export const clearCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync(KEY_EMAIL);
    await SecureStore.deleteItemAsync(KEY_PASSWORD);
    await SecureStore.deleteItemAsync(KEY_TOKEN);
  } catch (e) {}
};

// --- Layer 1: API token (never expires) -------------------------------------
// Requires sfa_crm.api.get_api_token on the server (see ERPNEXT_TOKEN_SETUP.md).
// Called right after a successful login while the fresh sid is still valid.
const acquireApiToken = async (sid) => {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/method/sfa_crm.api.get_api_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': `sid=${sid}` },
      credentials: 'omit'
    });
    if (!response.ok) {
      console.log(`[TOKEN]: Server has no token endpoint yet (HTTP ${response.status}). Using silent re-login fallback.`);
      return false;
    }
    const data = await response.json();
    const token = data.message && data.message.token;
    if (token) {
      await SecureStore.setItemAsync(KEY_TOKEN, token);
      console.log('[TOKEN]: Permanent API token acquired and stored securely.');
      return true;
    }
    console.log('[TOKEN]: Endpoint responded without a token. Using silent re-login fallback.');
    return false;
  } catch (e) {
    console.log(`[TOKEN]: Could not acquire token: ${e.message}. Using silent re-login fallback.`);
    return false;
  }
};

const getApiToken = async () => {
  try {
    return await SecureStore.getItemAsync(KEY_TOKEN);
  } catch (e) {
    return null;
  }
};

const clearApiToken = async () => {
  try { await SecureStore.deleteItemAsync(KEY_TOKEN); } catch (e) {}
};

// --- Layer 2: silent background re-login ------------------------------------
// When the sid dies, log in again with the vaulted credentials - invisible to
// the user. A single shared promise prevents parallel re-login stampedes when
// several requests fail at the same time.
let reloginPromise = null;

const silentRelogin = async () => {
  if (reloginPromise) return reloginPromise; // already re-logging in
  reloginPromise = (async () => {
    const creds = await getCredentials();
    if (!creds) {
      console.log('[RELOGIN]: No stored credentials. Cannot re-login silently.');
      return false;
    }
    console.log('[RELOGIN]: Session expired. Attempting silent background re-login...');
    const result = await loginToERP(creds.email, creds.password);
    if (result.success) {
      console.log('[RELOGIN]: Silent re-login successful. Session renewed invisibly.');
      return true;
    }
    console.log(`[RELOGIN]: Silent re-login failed: ${result.error}`);
    return false;
  })();
  try {
    return await reloginPromise;
  } finally {
    reloginPromise = null;
  }
};

// --- Layer 3: last resort - route user to Login ------------------------------
const handleAuthFailure = async () => {
  console.log('[AUTH]: Session rejected and silent recovery failed. Clearing stored session.');
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
  const token = await getApiToken();
  const sid = await AsyncStorage.getItem('erp_sid');
  const creds = await getCredentials();
  if (!token && !sid && !creds) return { valid: false, reason: 'no_session' };

  const baseUrl = await getBaseUrl();
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `token ${token}`;
  else if (sid) headers['Cookie'] = `sid=${sid}`;

  try {
    if (token || sid) {
      const response = await fetch(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message && data.message !== 'Guest') {
          console.log(`[AUTH]: Session check OK. Logged in as ${data.message}`);
          return { valid: true, user: data.message };
        }
      } else if (response.status !== 401 && response.status !== 403) {
        // Server up but misbehaving (5xx etc.) - don't punish the user.
        return { valid: false, reason: 'server_error', offlineOk: true };
      }
      // Token/sid rejected -> clean up whichever credential failed.
      console.log('[AUTH]: Stored token/session rejected by server.');
      if (token) await clearApiToken();
      await clearSession();
    }

    // Permanent login: recover automatically with vaulted credentials
    // instead of showing the Login screen.
    if (creds) {
      const renewed = await silentRelogin();
      if (renewed) {
        const user = await AsyncStorage.getItem('erp_user');
        return { valid: true, user, renewed: true };
      }
    }
    return { valid: false, reason: 'expired' };
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
  // Explicit logout is the ONLY thing that ends the permanent login:
  // wipe session, the never-expiring token, and the vaulted credentials.
  await clearSession();
  await clearCredentials();
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

      // Permanent login: vault credentials for silent re-login, then try to
      // upgrade to a never-expiring API token while the sid is fresh.
      await saveCredentials(email, password);
      await acquireApiToken(sid);

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

// Builds the auth headers for one attempt. Prefers the permanent API token;
// falls back to the sid cookie when no token is available.
const buildAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  const token = await getApiToken();
  if (token) {
    headers['Authorization'] = `token ${token}`; // never expires
    return headers;
  }
  const sid = await AsyncStorage.getItem('erp_sid');
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
};

// For raw downloads (e.g. PDF via expo-file-system) that cannot go through
// authFetch. Prefers the permanent token; falls back to the sid cookie.
export const getDownloadAuthHeaders = async () => {
  const token = await getApiToken();
  if (token) return { 'Authorization': `token ${token}` };
  const sid = await AsyncStorage.getItem('erp_sid');
  return sid ? { 'Cookie': `sid=${sid}` } : {};
};

export const authFetch = async (endpoint, method = 'GET', body = null, _isRetry = false) => {
  const baseUrl = await getBaseUrl();
  const headers = await buildAuthHeaders();
  // credentials:'omit' prevents React Native's persistent native cookie store
  // from silently attaching/overriding cookies. Without this, a stale sid kept
  // being sent until the app was uninstalled.
  const config = { method, headers, credentials: 'omit' };
  if (body) config.body = JSON.stringify(body);

  console.log(`[API REQUEST]: ${method} -> ${endpoint}${_isRetry ? ' (retry after re-auth)' : ''}`);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    const text = await response.text();
    console.log(`[API RESPONSE]: Code ${response.status}`);

    // Auth failure -> recover silently instead of disturbing the user.
    if (isAuthErrorResponse(response.status, text)) {
      if (_isRetry) {
        // Recovery already attempted for this request; give up for real.
        await handleAuthFailure();
        return { success: false, error: 'Session expired. Please log in again.', sessionExpired: true };
      }

      // If a token was used and got rejected, it was revoked/regenerated
      // server-side - discard it so we fall back to sid/re-login.
      if (headers['Authorization']) {
        console.log('[TOKEN]: Stored API token rejected by server. Discarding it.');
        await clearApiToken();
      }

      // Layer 2: silent re-login with vaulted credentials, then retry once.
      const renewed = await silentRelogin();
      if (renewed) {
        return authFetch(endpoint, method, body, true);
      }

      // Layer 3: nothing worked (no stored credentials / password changed).
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

    // Preferred: server-side filtered catalog. Only items with
    // 'Show in SFA App' enabled in ERPNext are returned - hidden items
    // never reach the device.
    const catalogRes = await authFetch('/api/method/sfa_crm.api.get_sfa_items');
    if (catalogRes && catalogRes.message && catalogRes.message.success) {
      await AsyncStorage.setItem('offlineItems', JSON.stringify(catalogRes.message.items));
      console.log(`[PULL-MASTER]: Synced ${catalogRes.message.items.length} SFA-visible items (server-filtered).`);
    } else {
      // Fallback for servers not yet updated with get_sfa_items:
      // filter by the flag directly in the resource query.
      console.log('[PULL-MASTER]: get_sfa_items unavailable, using legacy item query.');
      let itemsRes = await authFetch('/api/resource/Item?fields=["name","item_name"]&filters=[["disabled","=",0],["custom_show_in_sfa_app","=",1]]&limit_page_length=500');
      if (!itemsRes || !itemsRes.data) {
        // Oldest servers without the custom field at all.
        itemsRes = await authFetch('/api/resource/Item?fields=["name","item_name"]&filters=[["disabled","=",0]]&limit_page_length=500');
      }
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
