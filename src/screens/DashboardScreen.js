import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { authFetch } from '../api';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [routeClients, setRouteClients] = useState([]);
  const [stats, setStats] = useState({ visits: 0, orders: 0, totalValue: 0 });
  const [userName, setUserName] = useState('Agent');

  useFocusEffect(
    useCallback(() => { 
      loadDashboardData(); 
      pingLocation(); 
      AsyncStorage.getItem('erp_user').then(name => { if(name) setUserName(name.split(' ')[0]); });
    }, [])
  );

  const pingLocation = async () => {
    let loc = await Location.getLastKnownPositionAsync({});
    if (loc) {
      await authFetch('/api/method/sfa_crm.api.force_log_location', 'POST', {
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        timestamp: new Date().toISOString().replace('T',' ').substring(0, 19), activity: 'App Active'
      });
    }
  };

  const loadDashboardData = async () => {
    try {
      const storedClients = await AsyncStorage.getItem('offlineClients');
      if (storedClients) setRouteClients(JSON.parse(storedClients));
      const vStr = await AsyncStorage.getItem('offlineVisits');
      const oStr = await AsyncStorage.getItem('offlineOrders');
      const visits = vStr ? JSON.parse(vStr) : []; 
      const orders = oStr ? JSON.parse(oStr) : []; 
      const totalVal = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      setStats({ visits: visits.length, orders: orders.length, totalValue: totalVal });
    } catch (e) {}
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: async () => { await AsyncStorage.clear(); navigation.replace('Login'); } }
    ]);
  };

  const handleEndShift = async () => {
    Alert.alert("End Shift", "This will wipe today's offline route. Ensure you have synced everything.", [
      { text: "Cancel", style: "cancel" },
      { text: "End Shift", onPress: async () => { await AsyncStorage.removeItem('dayStarted'); navigation.replace('StartDay'); } }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Red Curve (FinTech Style) */}
      <View style={styles.topCurve}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Habari, {userName}</Text>
            <Text style={styles.subGreeting}>Sales Representative</Text>
          </View>
          <MaterialCommunityIcons name="account-circle" size={45} color="white" />
        </View>
      </View>

      {/* Overlapping Wallet Card */}
      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>Total Sales Value</Text>
        <Text style={styles.walletAmount}>Tsh {stats.totalValue.toLocaleString()}</Text>
        <View style={styles.walletDivider} />
        <View style={styles.walletStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.visits}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{routeClients.length}</Text>
            <Text style={styles.statLabel}>Route Target</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{paddingTop: 120, paddingHorizontal: 20}}>
        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Sync')}>
            <View style={[styles.iconBox, {backgroundColor: '#e3f2fd'}]}><MaterialCommunityIcons name="cloud-sync" size={28} color="#1976d2" /></View>
            <Text style={styles.gridText}>Sync Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('HistoryScreen')}>
            <View style={[styles.iconBox, {backgroundColor: '#f3e5f5'}]}><MaterialCommunityIcons name="history" size={28} color="#8e24aa" /></View>
            <Text style={styles.gridText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={handleEndShift}>
            <View style={[styles.iconBox, {backgroundColor: '#fff3e0'}]}><MaterialCommunityIcons name="stop-circle-outline" size={28} color="#f57c00" /></View>
            <Text style={styles.gridText}>End Shift</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={handleLogout}>
            <View style={[styles.iconBox, {backgroundColor: '#ffebee'}]}><MaterialCommunityIcons name="logout" size={28} color="#d32f2f" /></View>
            <Text style={styles.gridText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Route List */}
        <Text style={styles.sectionTitle}>Today's Clients ({routeClients.length})</Text>
        {routeClients.length === 0 ? (
          <Text style={styles.noDataText}>No clients assigned. Sync data to begin.</Text>
        ) : (
          routeClients.map(client => (
            <View key={client.id} style={styles.clientCard}>
              <View style={styles.clientIcon}><MaterialCommunityIcons name="storefront" size={24} color="#d32f2f" /></View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientSub}>{client.status === 'Synced' ? 'Available' : 'Pending'}</Text>
              </View>
              <TouchableOpacity style={styles.visitBtn} onPress={() => navigation.navigate('VisitCheckIn', { clientName: client.name })}>
                <Text style={styles.btnText}>Visit</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  topCurve: { backgroundColor: '#D32F2F', height: 220, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 20, paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subGreeting: { color: '#ffcdd2', fontSize: 14, marginTop: 4 },
  walletCard: { position: 'absolute', top: 130, left: 20, right: 20, backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, zIndex: 10 },
  walletTitle: { color: 'gray', fontSize: 14, fontWeight: '600' },
  walletAmount: { color: '#333', fontSize: 32, fontWeight: 'bold', marginVertical: 5 },
  walletDivider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  walletStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' },
  statLabel: { fontSize: 12, color: 'gray', marginTop: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  gridItem: { alignItems: 'center', width: (width - 60) / 4 },
  iconBox: { width: 55, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridText: { fontSize: 12, color: '#555', fontWeight: '500' },
  clientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  clientIcon: { width: 45, height: 45, backgroundColor: '#ffebee', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  clientSub: { fontSize: 12, color: 'gray', marginTop: 3 },
  visitBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  noDataText: { textAlign: 'center', color: 'gray', marginTop: 10 }
});
