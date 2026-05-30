import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { pushLiveVisit } from '../api';

export default function VisitCheckInScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const clientName = route.params?.clientName || "Assigned Client";
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [reason, setReason] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

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
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') { 
      let loc = await Location.getCurrentPositionAsync({}); 
      await AsyncStorage.setItem('activeLat', loc.coords.latitude.toString()); 
      await AsyncStorage.setItem('activeLng', loc.coords.longitude.toString()); 
    }
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
    if (!result.canceled) { 
      setPhotoUri(result.assets[0].uri); 
      await AsyncStorage.setItem('activePhotoBase64', result.assets[0].base64); 
    }
  };

  const endVisit = async () => {
    if (!outcome) return Alert.alert("Required", "You must Take an Order or flag No Order.");
    if (outcome === 'no_order' && (!reason || !photoUri)) return Alert.alert("Required", "Reason and Evidence Photo are mandatory for No Order.");

    const endTime = Date.now();
    const b64 = await AsyncStorage.getItem('activePhotoBase64');
    const lat = await AsyncStorage.getItem('activeLat');
    const lng = await AsyncStorage.getItem('activeLng');
    
    const visitRecord = {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      photoBase64: b64,
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
      console.log('Visit Record Being Sent:', visitRecord);
      const livePush = await pushLiveVisit(visitRecord);
      console.log('Visit Push Result:', livePush);
      
      if (livePush.success) {
        visitRecord.status = 'Synced';
        Alert.alert("Live Success", `Visit logged to ERPNext! ${livePush.erpName || ''}`);
      } else {
        Alert.alert("Offline Mode", "Saved locally. Sync later.");
      }

      const existingVisits = await AsyncStorage.getItem('offlineVisits');
      const visitsArray = existingVisits ? JSON.parse(existingVisits) : [];
      visitsArray.push(visitRecord);
      await AsyncStorage.setItem('offlineVisits', JSON.stringify(visitsArray));

      await AsyncStorage.removeItem('activeVisitClient');
      await AsyncStorage.removeItem('activeVisitTime');
      await AsyncStorage.removeItem('activePhotoBase64'); 
      await AsyncStorage.removeItem('activeLat'); 
      await AsyncStorage.removeItem('activeLng');

      Alert.alert("Checkout Complete", "Visit safely logged.", [{ text: "OK", onPress: () => navigation.goBack() }]);
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
    <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: insets.bottom + 40 }} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.activeText}>🟢 Active Visit: {clientName}</Text>

        <Text style={styles.label}>Competitor Brands on Shelf:</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15}}>
          {['Brand X', 'Brand Y', 'Local Brand', 'None'].map(brand => (
            <TouchableOpacity key={brand} onPress={() => setCompetitors(competitors.includes(brand) ? competitors.replace(brand+', ', '') : competitors + brand + ', ')} style={{backgroundColor: competitors.includes(brand) ? '#1976D2' : '#ddd', padding: 10, borderRadius: 20, margin: 5}}>
              <Text style={{color: competitors.includes(brand) ? 'white' : 'black'}}>{brand}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!outcome ? (
          <View style={{marginTop: 20}}>
            <TouchableOpacity style={styles.orderBtn} onPress={() => { setOutcome('order'); navigation.navigate('ProductCatalog', {clientName}); }}>
              <Text style={styles.btnText}>TAKE ORDER / QUOTE</Text>
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
            <TextInput style={styles.input} placeholder="e.g., Shop Closed, Boss Absent..." value={reason} onChangeText={setReason} />
            <TouchableOpacity style={[styles.cameraBtn, photoUri && {backgroundColor: '#4CAF50'}]} onPress={openCamera}>
              <Text style={styles.btnText}>{photoUri ? "Evidence Captured" : "Take Evidence Photo"}</Text>
            </TouchableOpacity>
            {photoUri && <Image source={{uri: photoUri}} style={{width: '100%', height: 200, borderRadius: 8, marginTop: 15}} />}
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
  container: { flex: 1, backgroundColor: '#f4f4f4' },
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
  cameraBtn: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, alignItems: 'center' },
  checkoutBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
