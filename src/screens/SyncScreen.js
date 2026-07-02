import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { syncAllDataToERP, pullMasterData } from '../api';

export default function SyncScreen() {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handlePush = async () => {
    setIsPushing(true);
    // You would loop through your AsyncStorage queues here and call pushLiveOrder / pushLiveVisit
    const result = await syncAllDataToERP(); 
    setIsPushing(false);
    if (result && result.success) Alert.alert("Sync Complete", "Queued data pushed to ERPNext.");
    else Alert.alert("Sync Failed", "Check connection and Error Logs.");
  };

  const handlePull = async () => {
    setIsPulling(true);
    const result = await pullMasterData();
    setIsPulling(false);
    if (result && result.success) Alert.alert("Data Updated", "Latest Customers/Leads and Prices pulled from ERPNext.");
    else Alert.alert("Pull Failed", "Could not reach server.");
  };

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="cloud-sync" size={80} color="#1976D2" />
      <Text style={{fontSize: 24, fontWeight: 'bold', marginBottom: 30, marginTop: 10}}>Data Sync Engine</Text>
      
      <TouchableOpacity style={styles.btnPush} onPress={handlePush} disabled={isPushing || isPulling}>
        {isPushing ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>PUSH LOCAL DATA TO ERP</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.btnPull} onPress={handlePull} disabled={isPushing || isPulling}>
        {isPulling ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>PULL MASTER DATA (Refresh)</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20, alignItems: 'center', justifyContent: 'center' },
  btnPush: { backgroundColor: '#D32F2F', padding: 20, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 20 },
  btnPull: { backgroundColor: '#1976D2', padding: 20, borderRadius: 10, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
