import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VisitCheckInScreen({ navigation, route }) {
  const clientName = route.params?.clientName || "Assigned Client";
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  
  const [outcome, setOutcome] = useState(null);
  const [reason, setReason] = useState('');
  const [competitors, setCompetitors] = useState('');

  useEffect(() => { checkActiveVisit(); }, []);

  const checkActiveVisit = async () => {
    const activeClient = await AsyncStorage.getItem('activeVisitClient');
    const activeTime = await AsyncStorage.getItem('activeVisitTime');
    if (activeClient === clientName && activeTime) setStartTime(parseInt(activeTime));
    setLoading(false);
  };

  const startVisit = async () => {
    const now = Date.now();
    setStartTime(now);
    await AsyncStorage.setItem('activeVisitClient', clientName);
    await AsyncStorage.setItem('activeVisitTime', now.toString());
  };

  const endVisit = async () => {
    if (!outcome) return Alert.alert("Required", "You must Take an Order or flag No Order.");
    if (outcome === 'no_order' && !reason) return Alert.alert("Required", "Reason is mandatory for No Order.");

    const endTime = Date.now();
    
    // Create the Visit Record
    const visitRecord = {
      id: endTime.toString(),
      customer: clientName,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      outcome: outcome === 'order' ? 'Order Taken' : 'No Order',
      no_order_reason: reason,
      competitor_brands: competitors,
      status: 'Pending Sync'
    };

    try {
      // Save offline
      const existingVisits = await AsyncStorage.getItem('offlineVisits');
      const visitsArray = existingVisits ? JSON.parse(existingVisits) : [];
      visitsArray.push(visitRecord);
      await AsyncStorage.setItem('offlineVisits', JSON.stringify(visitsArray));

      // Clear active state
      await AsyncStorage.removeItem('activeVisitClient');
      await AsyncStorage.removeItem('activeVisitTime');

      Alert.alert("Checkout Complete", "Visit safely logged offline.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert("Error", "Could not save visit.");
    }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#D32F2F" /></View>;

  if (!startTime) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>{clientName}</Text>
        <TouchableOpacity style={styles.startBtn} onPress={startVisit}>
          <Text style={styles.btnText}>START VISIT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.activeText}>🟢 Active Visit: {clientName}</Text>

        <Text style={styles.label}>Competitor Brands on Shelf:</Text>
        <TextInput style={styles.input} placeholder="E.g., Brand X, Brand Y" value={competitors} onChangeText={setCompetitors} />

        {!outcome ? (
          <View style={{marginTop: 20}}>
            <TouchableOpacity style={styles.orderBtn} onPress={() => { setOutcome('order'); navigation.navigate('ProductCatalog', {clientName}); }}>
              <Text style={styles.btnText}>TAKE ORDER</Text>
            </TouchableOpacity>
            <Text style={{textAlign: 'center', marginVertical: 10}}>--- OR ---</Text>
            <TouchableOpacity style={styles.noOrderBtn} onPress={() => setOutcome('no_order')}>
              <Text style={[styles.btnText, {color: '#D32F2F'}]}>FLAG NO ORDER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedText}>{outcome === 'order' ? "✅ Order Mode Selected" : "❌ No Order Mode Selected"}</Text>
            <TouchableOpacity onPress={() => setOutcome(null)}>
              <Text style={{color: 'blue', marginTop: 10, textAlign: 'center'}}>Change Mind (Reset)</Text>
            </TouchableOpacity>
          </View>
        )}

        {outcome === 'no_order' && (
          <View style={styles.noOrderBox}>
            <Text style={styles.label}>Reason for No Order:</Text>
            <TextInput style={styles.input} placeholder="Reason..." value={reason} onChangeText={setReason} />
          </View>
        )}

        <TouchableOpacity style={styles.checkoutBtn} onPress={endVisit}>
          <Text style={styles.btnText}>CHECKOUT & COMPLETE VISIT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { flex: 1, padding: 15, backgroundColor: '#f4f4f4' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 3 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  activeText: { color: '#4CAF50', fontWeight: 'bold', marginBottom: 15, textAlign: 'center', fontSize: 16 },
  label: { fontWeight: 'bold', marginBottom: 5 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  startBtn: { backgroundColor: '#4CAF50', padding: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
  orderBtn: { backgroundColor: '#1976D2', padding: 15, borderRadius: 8, alignItems: 'center' },
  noOrderBtn: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#D32F2F' },
  lockedBox: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 8, alignItems: 'center', marginVertical: 20 },
  lockedText: { fontWeight: 'bold', fontSize: 16 },
  noOrderBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 8, marginTop: 10 },
  checkoutBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
