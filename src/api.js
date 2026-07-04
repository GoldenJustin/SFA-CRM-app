import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = async () => {
  const url = await AsyncStorage.getItem('erp_url');
  return url ? url.replace(/\/$/, "") : 'http://server.royal.co.tz:8092';
};

export const loginToERP = async (email, password) => {
  const baseUrl = await getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ usr: email, pwd: password })
    });
    const data = await response.json();
    if (response.ok && data.message === "Logged In") {
      const cookieStr = response.headers.get('set-cookie');
      let sid = '';
      if (cookieStr) {
        const match = cookieStr.match(/sid=([^;]+)/);
        if (match) sid = match[1];
      }
      await AsyncStorage.setItem('erp_sid', sid);
      await AsyncStorage.setItem('erp_user', data.full_name);
      await AsyncStorage.setItem('erp_url', baseUrl);
      return { success: true, user: data.full_name };
    } else { return { success: false, error: data.message || 'Invalid Credentials' }; }
  } catch (error) { return { success: false, error: 'Cannot reach server.' }; }
};

export const authFetch = async (endpoint, method = 'GET', body = null) => {
  const baseUrl = await getBaseUrl();
  const sid = await AsyncStorage.getItem('erp_sid');
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': `sid=${sid}` };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  
  console.log(`\n============== [API REQUEST] ==============`);
  console.log(`${method} ${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    const text = await response.text();
    return JSON.parse(text);
  } catch (e) { 
    console.log(`[NETWORK ERROR]:`, e.message);
    return { success: false, error: e.message }; 
  }
};

export const pushLiveClient = async (clientData) => {
  try {
    const payload = {
      name: clientData.name, phone: clientData.phone,
      lat: clientData.lat, lng: clientData.lng,
      businessType: clientData.businessType,
      contactRole: clientData.contactRole,
      ownerPhone: clientData.ownerPhone,
      notes: clientData.notes,
      photosBase64: clientData.photosBase64 || []
    };
    const res = await authFetch('/api/method/sfa_crm.api.sync_client', 'POST', { payload: JSON.stringify(payload) });
    if (res.message && res.message.success) return { success: true, erpName: res.message.name };
    return { success: false, error: res.message?.error || 'Unknown Error' };
  } catch (e) { return { success: false, error: e.message }; }
};

export const pushLiveOrder = async (orderData) => {
  try {
    const erpDoctype = orderData.type === 'Quotation' ? 'Quotation' : 'Sales Order';
    const itemsPayload = orderData.items.map(i => ({ item_code: i.id, item_name: i.name, qty: i.qty, rate: i.price }));
    const payload = { customer: orderData.clientName, delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], items: itemsPayload };
    const res = await authFetch(`/api/method/sfa_crm.api.sync_order`, 'POST', { doc_type: erpDoctype, payload: JSON.stringify(payload) });
    if (res.message && res.message.success) return { success: true, erpName: res.message.name };
    return { success: false, error: res.message?.error || 'Unknown Error' };
  } catch (e) { return { success: false, error: e.message }; }
};

export const pushLiveVisit = async (visitData) => {
  try {
    const payload = {
      customer: visitData.customer, start_time: visitData.start_time, end_time: visitData.end_time,
      outcome: visitData.outcome, no_order_reason: visitData.no_order_reason || '',
      lat: visitData.lat, lng: visitData.lng, photoBase64: visitData.photoBase64 || null
    };
    const res = await authFetch(`/api/method/sfa_crm.api.sync_visit`, 'POST', { payload: JSON.stringify(payload) });
    if (res.message && res.message.success) return { success: true, erpName: res.message.name };
    return { success: false, error: res.message?.error || 'Unknown' };
  } catch (e) { return { success: false, error: e.message }; }
};

export const pullMasterData = async () => {
  try {
    const settings = await authFetch('/api/method/sfa_crm.api.get_sfa_settings');
    if (settings && settings.message) await AsyncStorage.setItem('sfaSettings', JSON.stringify(settings.message));
    
    const itemsRes = await authFetch('/api/resource/Item?fields=["name","item_name"]&limit_page_length=500');
    const pricesRes = await authFetch('/api/resource/Item Price?fields=["item_code","price_list_rate"]&filters=[["selling","=",1]]&limit_page_length=500');
    if (itemsRes && itemsRes.data) {
      const prices = pricesRes.data || [];
      const formattedItems = itemsRes.data.map(i => {
        const pObj = prices.find(p => p.item_code === i.name);
        return { id: i.name, name: i.item_name, price: pObj ? pObj.price_list_rate : 0 };
      });
      await AsyncStorage.setItem('offlineItems', JSON.stringify(formattedItems));
    }
    
    const custRes = await authFetch('/api/resource/Customer?fields=["name","customer_name","custom_latitude","custom_longitude","image","mobile_no","custom_business_type"]&limit_page_length=500');
    const leadRes = await authFetch('/api/resource/Lead?fields=["name","lead_name as customer_name","image","mobile_no","custom_business_type"]&filters=[["status","!=","Converted"]]&limit_page_length=500');
    
    let allClients = [];
    if (custRes && custRes.data) allClients = [...allClients, ...custRes.data];
    if (leadRes && leadRes.data) allClients = [...allClients, ...leadRes.data];
    
    const baseUrl = await getBaseUrl();
    const formattedCusts = allClients.map(c => ({
      id: c.name, name: c.customer_name, 
      lat: c.custom_latitude ? parseFloat(c.custom_latitude) : null, 
      lng: c.custom_longitude ? parseFloat(c.custom_longitude) : null, 
      image: c.image ? `${baseUrl}${c.image}` : null,
      phone: c.mobile_no || 'No Phone', businessType: c.custom_business_type || 'Unknown Type', status: 'Synced'
    }));
    await AsyncStorage.setItem('offlineClients', JSON.stringify(formattedCusts));
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
};

export const syncAllDataToERP = async () => {
  try {
    // 1. Sync Offline Clients (KYC)
    let existingClients = await AsyncStorage.getItem('offlineClients');
    let clients = existingClients ? JSON.parse(existingClients) : [];
    let clientsUpdated = false;
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].status === 'Pending Sync') {
        let res = await pushLiveClient(clients[i]);
        if (res.success) {
          clients[i].status = 'Synced';
          clients[i].id = res.erpName; // Update local ID with official ERPNext ID
          clientsUpdated = true;
        }
      }
    }
    if (clientsUpdated) await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));

    // 2. Sync Offline Orders
    let existingOrders = await AsyncStorage.getItem('offlineOrders');
    let orders = existingOrders ? JSON.parse(existingOrders) : [];
    for (let o of orders) {
      if (o.status === 'Pending Sync') {
        // If order belongs to a pending client, update the name to the real ERP ID
        let matchingClient = clients.find(c => c.name === o.clientName);
        if (matchingClient && matchingClient.id) o.clientName = matchingClient.id;

        let res = await pushLiveOrder(o);
        if (res.success) { o.status = 'Synced'; o.erpName = res.erpName; }
      }
    }
    await AsyncStorage.setItem('offlineOrders', JSON.stringify(orders));

    // 3. Sync Offline Visits
    let existingVisits = await AsyncStorage.getItem('offlineVisits');
    let visits = existingVisits ? JSON.parse(existingVisits) : [];
    for (let v of visits) {
      if (v.status === 'Pending Sync') {
        let matchingClient = clients.find(c => c.name === v.customer);
        if (matchingClient && matchingClient.id) v.customer = matchingClient.id;

        let res = await pushLiveVisit(v);
        if (res.success) { v.status = 'Synced'; }
      }
    }
    await AsyncStorage.setItem('offlineVisits', JSON.stringify(visits));

    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};
