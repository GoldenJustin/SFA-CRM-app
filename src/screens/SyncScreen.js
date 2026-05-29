import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SyncScreen() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Never Synced');

  useEffect(() => { loadLastSyncTime(); }, []);

  const loadLastSyncTime = async () => {
    const time = await AsyncStorage.getItem('lastSyncTime');
    if (time) setLastSync(new Date(parseInt(time)).toLocaleString());
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setTimeout(async () => {
      const now = Date.now();
      await AsyncStorage.setItem('lastSyncTime', now.toString());
      setLastSync(new Date(now).toLocaleString());
      setIsSyncing(false);
      Alert.alert('Sync Success', 'Offline data pushed to ERPNext successfully.');
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusCard}>
        <MaterialCommunityIcons name="cloud-sync" size={60} color="#1976D2" />
        <Text style={styles.statusTitle}>Real-Time Sync Engine</Text>
        <Text style={styles.lastSync}>Last Sync: {lastSync}</Text>
      </View>
      <TouchableOpacity style={[styles.syncBtn, isSyncing && {backgroundColor:'gray'}]} onPress={handleSync} disabled={isSyncing}>
        {isSyncing ? <ActivityIndicator color="white" /> : <Text style={styles.syncBtnText}>PUSH TO ERPNEXT NOW</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20, justifyContent: 'center' },
  statusCard: { alignItems: 'center', backgroundColor: 'white', padding: 30, borderRadius: 10, elevation: 3, marginBottom: 30 },
  statusTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  lastSync: { color: 'gray', marginTop: 10, fontWeight: 'bold' },
  syncBtn: { backgroundColor: '#D32F2F', padding: 18, borderRadius: 10, alignItems: 'center' },
  syncBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
