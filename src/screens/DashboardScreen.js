import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen({ navigation }) {
  const [routeClients, setRouteClients] = useState([]);

  useFocusEffect(
    useCallback(() => { loadRoutes(); }, [])
  );

  const loadRoutes = async () => {
    try {
      const storedClients = await AsyncStorage.getItem('offlineClients');
      if (storedClients) setRouteClients(JSON.parse(storedClients));
    } catch (e) {}
  };

  const handleEndDay = async () => {
    Alert.alert("Clock Out", "Ensure all data is synced before clocking out.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clock Out", onPress: async () => {
          await AsyncStorage.removeItem('dayStarted');
          navigation.replace('StartDay');
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Overview</Text>
            <Text style={styles.headerSub}>Sales Rep Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.endDayBtn} onPress={handleEndDay}>
            <MaterialCommunityIcons name="logout" size={20} color="#D32F2F" />
            <Text style={styles.endDayText}>End Day</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Today's Assigned Route ({routeClients.length})</Text>
        
        {routeClients.length === 0 ? (
          <Text style={styles.noDataText}>No clients assigned. Add via Clients tab.</Text>
        ) : (
          routeClients.map(client => (
            <View key={client.id} style={styles.clientCard}>
              <View>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientSub}>{client.businessType || 'Retail'}</Text>
              </View>
              <TouchableOpacity style={styles.visitBtn} onPress={() => navigation.navigate('VisitCheckIn', { clientName: client.name })}>
                <Text style={styles.btnText}>Start</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D32F2F', padding: 25, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#ffcdd2', fontSize: 14, marginTop: 2 },
  endDayBtn: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  endDayText: { color: '#D32F2F', fontWeight: 'bold', marginLeft: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 20, color: '#333' },
  noDataText: { textAlign: 'center', color: 'gray', marginTop: 20 },
  clientCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, elevation: 2 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  clientSub: { color: 'gray', fontSize: 12, marginTop: 4 },
  visitBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
