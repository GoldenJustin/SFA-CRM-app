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
    } else { return { success: false, error: data.message || 'Invalid Credentials' }; }
  } catch (error) { return { success: false, error: 'Cannot reach server.' }; }
};

export const authFetch = async (endpoint, method = 'GET', body = null) => {
  const baseUrl = await getBaseUrl();
  const sid = await AsyncStorage.getItem('erp_sid');
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': `sid=${sid}` };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  
  console.log(`[API] ${method} ${endpoint}`, body ? JSON.stringify(body).substring(0, 300) : '');
  const response = await fetch(`${baseUrl}${endpoint}`, config);
  const result = await response.json();
  console.log(`[API Response]`, JSON.stringify(result).substring(0, 500));
  return result;
};

const uploadFileToERP = async (base64String, doctype, docname, fieldname) => {
  try {
    const baseUrl = await getBaseUrl();
    const sid = await AsyncStorage.getItem('erp_sid');
    
    console.log(`[File Upload] Attaching to ${doctype} ${docname} field ${fieldname}`);
    
    // Convert base64 to blob-like structure for FormData
    const formData = new FormData();
    formData.append('file', {
      uri: `data:image/jpeg;base64,${base64String}`,
      type: 'image/jpeg',
      name: `evidence_${Date.now()}.jpg`
    });
    formData.append('doctype', doctype);
    formData.append('docname', docname);
    formData.append('fieldname', fieldname);
    formData.append('is_private', '0');
    
    const response = await fetch(`${baseUrl}/api/method/upload_file`, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sid}`
      },
      body: formData
    });
    
    const result = await response.json();
    console.log('[File Upload Result]:', JSON.stringify(result).substring(0, 300));
    
    if (result.message && result.message.file_url) {
      console.log('[File Upload] SUCCESS! URL:', result.message.file_url);
      return { success: true, file_url: result.message.file_url };
    }
    return result;
  } catch (e) {
    console.error('[File Upload Error]:', e);
    return { success: false, error: e.message };
  }
};

export const pushLiveOrder = async (orderData) => {
  try {
    const erpDoctype = orderData.type === 'Quotation' ? 'Quotation' : 'Sales Order';
    const itemsPayload = orderData.items.map(item => ({ 
      item_code: item.id,
      item_name: item.name,
      qty: item.qty,
      rate: item.price
    }));
    
    const payload = { 
      customer: orderData.clientName,
      delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: itemsPayload,
      docstatus: 1 
    };
    
    console.log(`[Push Live Order] Creating ${erpDoctype}`);
    const res = await authFetch(`/api/resource/${erpDoctype}`, 'POST', payload);
    
    if (res.data && res.data.name) {
      console.log(`[Push Live Order] SUCCESS: ${res.data.name}`);
      return { success: true, erpName: res.data.name };
    }
    console.error('[Push Live Order] FAILED:', res);
    return { success: false, error: res };
  } catch (e) { 
    console.error('[Push Live Order] EXCEPTION:', e);
    return { success: false, error: e.message }; 
  }
};

export const pushLiveVisit = async (visitData) => {
  try {
    const payload = {
      customer: visitData.customer,
      start_time: visitData.start_time.replace('T', ' ').substring(0, 19),
      end_time: visitData.end_time.replace('T', ' ').substring(0, 19),
      outcome: visitData.outcome,
      no_order_reason: visitData.no_order_reason || '',
      competitor_brands: visitData.competitor_brands || '',
      custom_latitude: visitData.lat?.toString() || '',
      custom_longitude: visitData.lng?.toString() || '',
      docstatus: 0
    };
    
    console.log('[Push Live Visit] Creating Visit Log (Draft)...');
    const res = await authFetch('/api/resource/Visit Log', 'POST', payload);
    
    if (res.data && res.data.name) {
      console.log(`[Push Live Visit] Visit Created: ${res.data.name}`);
      
      if (visitData.photoBase64) {
        console.log('[Push Live Visit] Uploading evidence photo...');
        const uploadResult = await uploadFileToERP(visitData.photoBase64, 'Visit Log', res.data.name, 'evidence_photo');
        console.log('[Push Live Visit] Upload Result:', uploadResult);
      }
      
      console.log('[Push Live Visit] Submitting document...');
      const submitRes = await authFetch(`/api/resource/Visit Log/${res.data.name}`, 'PUT', { docstatus: 1 });
      console.log('[Push Live Visit] Submit Result:', submitRes);
      
      return { success: true, erpName: res.data.name };
    }
    console.error('[Push Live Visit] FAILED:', res);
    return { success: false, error: res };
  } catch (e) { 
    console.error('[Push Live Visit] EXCEPTION:', e);
    return { success: false, error: e.message }; 
  }
};

export const pullMasterData = async () => {
  try {
    const itemsRes = await authFetch('/api/resource/Item?fields=["name","item_name"]&limit_page_length=500');
    const pricesRes = await authFetch('/api/resource/Item Price?fields=["item_code","price_list_rate"]&filters=[["selling","=",1]]&limit_page_length=500');
    if (itemsRes.data) {
      const prices = pricesRes.data || [];
      const formattedItems = itemsRes.data.map(i => {
        const priceObj = prices.find(p => p.item_code === i.name);
        return { id: i.name, name: i.item_name, price: priceObj ? priceObj.price_list_rate : 0 };
      });
      await AsyncStorage.setItem('offlineItems', JSON.stringify(formattedItems));
    }
    const custRes = await authFetch('/api/resource/Customer?fields=["name","customer_name","mobile_no","custom_latitude","custom_longitude"]&limit_page_length=500');
    if (custRes.data) {
      const formattedCusts = custRes.data.map(c => ({
        id: c.name, name: c.customer_name, phone: c.mobile_no || 'N/A', 
        lat: parseFloat(c.custom_latitude) || null, lng: parseFloat(c.custom_longitude) || null, status: 'Synced'
      }));
      const existingStr = await AsyncStorage.getItem('offlineClients');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const pending = existing.filter(e => e.status === 'Pending Sync');
      await AsyncStorage.setItem('offlineClients', JSON.stringify([...formattedCusts, ...pending]));
    }
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
};

export const syncAllDataToERP = async () => {
  let syncLog = { clients: 0, visits: 0, orders: 0, errors: [] };
  try {
    const storedClients = await AsyncStorage.getItem('offlineClients');
    if (storedClients) {
      let clients = JSON.parse(storedClients);
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].status === 'Pending Sync') {
          const payload = {
            customer_name: clients[i].name, customer_group: 'Commercial', territory: 'All Territories',
            customer_type: 'Company', mobile_no: clients[i].phone, custom_business_type: clients[i].businessType,
            custom_owner_phone: clients[i].ownerPhone, custom_latitude: clients[i].lat?.toString(), custom_longitude: clients[i].lng?.toString()
          };
          try {
            const res = await authFetch('/api/resource/Customer', 'POST', payload);
            if (res?.data?.name) { clients[i].status = 'Synced'; syncLog.clients += 1; } 
            else { syncLog.errors.push(`Client ${clients[i].name} Error`); }
          } catch(err) { syncLog.errors.push(`Client ${clients[i].name} failed.`); }
        }
      }
      await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));
    }

    const storedVisits = await AsyncStorage.getItem('offlineVisits');
    if (storedVisits) {
      let visits = JSON.parse(storedVisits);
      for (let i = 0; i < visits.length; i++) {
        if (visits[i].status === 'Pending Sync') {
          const payload = {
            customer: visits[i].customer, start_time: visits[i].start_time.replace('T', ' ').substring(0, 19),
            end_time: visits[i].end_time.replace('T', ' ').substring(0, 19), outcome: visits[i].outcome,
            no_order_reason: visits[i].no_order_reason, competitor_brands: visits[i].competitor_brands,
            custom_latitude: visits[i].lat?.toString(), custom_longitude: visits[i].lng?.toString(),
            docstatus: 0
          };
          try {
            const res = await authFetch('/api/resource/Visit Log', 'POST', payload);
            if (res?.data?.name) { 
              if (visits[i].photoBase64) {
                await uploadFileToERP(visits[i].photoBase64, 'Visit Log', res.data.name, 'evidence_photo');
              }
              await authFetch(`/api/resource/Visit Log/${res.data.name}`, 'PUT', { docstatus: 1 });
              visits[i].status = 'Synced'; 
              syncLog.visits += 1; 
            } else { syncLog.errors.push(`Visit for ${visits[i].customer} Error`); }
          } catch(err) { syncLog.errors.push(`Visit ${visits[i].customer} failed.`); }
        }
      }
      await AsyncStorage.setItem('offlineVisits', JSON.stringify(visits));
    }

    const storedOrders = await AsyncStorage.getItem('offlineOrders');
    if (storedOrders) {
      let orders = JSON.parse(storedOrders);
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].status === 'Pending Sync') {
          const erpDoctype = orders[i].type === 'Quotation' ? 'Quotation' : 'Sales Order';
          const itemsPayload = orders[i].items.map(item => ({ 
            item_code: item.id, item_name: item.name, qty: item.qty, rate: item.price
          }));
          const payload = { 
            customer: orders[i].clientName, 
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: itemsPayload, docstatus: 1 
          };
          try {
            const res = await authFetch(`/api/resource/${erpDoctype}`, 'POST', payload);
            if (res?.data?.name) { orders[i].status = 'Synced'; orders[i].erpName = res.data.name; syncLog.orders += 1; } 
            else { syncLog.errors.push(`Order for ${orders[i].clientName} Error`); }
          } catch(err) { syncLog.errors.push(`Order ${orders[i].clientName} failed.`); }
        }
      }
      await AsyncStorage.setItem('offlineOrders', JSON.stringify(orders));
    }

    return { success: true, log: syncLog };
  } catch (error) { return { success: false, error: error.message }; }
};
