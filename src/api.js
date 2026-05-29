import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = async () => {
  const url = await AsyncStorage.getItem('erp_url');
  return url ? url.replace(/\/$/, "") : 'http://91.107.220.134';
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
      return { success: true, user: data.full_name };
    } else {
      return { success: false, error: data.message || 'Invalid Credentials' };
    }
  } catch (error) { return { success: false, error: 'Cannot reach server.' }; }
};

const authFetch = async (endpoint, method = 'GET', body = null) => {
  const baseUrl = await getBaseUrl();
  const sid = await AsyncStorage.getItem('erp_sid');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cookie': `sid=${sid}`
  };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${baseUrl}${endpoint}`, config);
  return await response.json();
};

// --- REAL SYNC ENGINE ---
export const syncAllDataToERP = async () => {
  let syncLog = { clients: 0, visits: 0, errors: [] };

  try {
    // 1. PUSH KYC CLIENTS
    const storedClients = await AsyncStorage.getItem('offlineClients');
    if (storedClients) {
      let clients = JSON.parse(storedClients);
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].status === 'Pending Sync') {
          // Map to standard ERPNext fields + custom fields
          const payload = {
            customer_name: clients[i].name,
            customer_group: 'Commercial', // ERPNext Default Required
            territory: 'All Territories', // ERPNext Default Required
            customer_type: 'Company',
            mobile_no: clients[i].phone,
            custom_business_type: clients[i].businessType,
            custom_owner_phone: clients[i].ownerPhone,
            custom_latitude: clients[i].lat?.toString(),
            custom_longitude: clients[i].lng?.toString()
          };

          const res = await authFetch('/api/resource/Customer', 'POST', payload);
          if (res.data && res.data.name) {
            clients[i].status = 'Synced';
            syncLog.clients += 1;
          } else {
            syncLog.errors.push(`Client ${clients[i].name}: ${JSON.stringify(res)}`);
          }
        }
      }
      await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));
    }

    // 2. PUSH VISIT LOGS
    const storedVisits = await AsyncStorage.getItem('offlineVisits');
    if (storedVisits) {
      let visits = JSON.parse(storedVisits);
      for (let i = 0; i < visits.length; i++) {
        if (visits[i].status === 'Pending Sync') {
          const payload = {
            customer: visits[i].customer,
            start_time: visits[i].start_time.replace('T', ' ').substring(0, 19), // Convert to ERP format
            end_time: visits[i].end_time.replace('T', ' ').substring(0, 19),
            outcome: visits[i].outcome,
            no_order_reason: visits[i].no_order_reason,
            competitor_brands: visits[i].competitor_brands
          };

          const res = await authFetch('/api/resource/Visit Log', 'POST', payload);
          if (res.data && res.data.name) {
            visits[i].status = 'Synced';
            syncLog.visits += 1;
          } else {
            syncLog.errors.push(`Visit ${visits[i].customer}: ${JSON.stringify(res)}`);
          }
        }
      }
      await AsyncStorage.setItem('offlineVisits', JSON.stringify(visits));
    }

    return { success: true, log: syncLog };

  } catch (error) {
    return { success: false, error: error.message };
  }
};
