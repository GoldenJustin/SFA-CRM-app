import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VisitCheckInScreen({ navigation, route }) {
  const clientName = route.params?.clientName || "Assigned Client";
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  
  const [outcome, setOutcome] = useState(null);
  const [reason, setReason] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    checkActiveVisit();
  }, []);

  // SMART FEATURE: Check if user already started a visit here before navigating away
  const checkActiveVisit = async () => {
    const activeClient = await AsyncStorage.getItem('activeVisitClient');
    const activeTime = await AsyncStorage.getItem('activeVisitTime');
    if (activeClient === clientName && activeTime) {
      setStartTime(parseInt(activeTime));
    }
    setLoading(false);
  };

  const startVisit = async () => {
    const now = Date.now();
    setStartTime(now);
    await AsyncStorage.setItem('activeVisitClient', clientName);
    await AsyncStorage.setItem('activeVisitTime', now.toString());
    // No alert shown - silently handles logic in background
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const endVisit = async () => {
    if (!outcome) return Alert.alert("Required", "You must Take an Order or flag No Order.");
    if (outcome === 'no_order' && (!reason || !photoUri)) return Alert.alert("Required", "Reason and Photo are mandatory for No Order.");

    const endTime = Date.now();
    const timeSpentMs = endTime - startTime;

    if (timeSpentMs < 120000) {
      Alert.alert("Warning", "Visit unusually short. Flagged for review.");
    }

    // Clear the active state so they can visit someone else
    await AsyncStorage.removeItem('activeVisitClient');
    await AsyncStorage.removeItem('activeVisitTime');

    Alert.alert("Checkout Complete", "Visit logged.", [{ text: "OK", onPress: () => navigation.goBack() }]);
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

        <Text style={styles.label}>Competitor Brands on Shelf (Select all that apply):</Text>
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
            <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
              <Text style={styles.btnText}>{photoUri ? "Evidence Captured" : "Take Evidence Photo"}</Text>
            </TouchableOpacity>
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
  cameraBtn: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, alignItems: 'center' },
  checkoutBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
