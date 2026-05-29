import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NewLeadScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('Retail Shop');
  const [contactRole, setContactRole] = useState('Owner');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);

  const businessTypes = ['Retail Shop', 'Wholesale', 'Supermarket', 'Kiosk', 'Pharmacy'];
  const roles = ['Owner', 'Manager', 'Employee'];

  const getRealGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'GPS Permission Denied');
    let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const saveClient = async () => {
    if (!name || !phone || !location) return Alert.alert("Error", "Name, Phone, and GPS are mandatory!");
    if (contactRole !== 'Owner' && !ownerPhone) return Alert.alert("Error", "Since contact is not the owner, Owner's Phone is required.");

    const newClient = {
      id: Date.now().toString(),
      name, phone, businessType, contactRole, ownerPhone, notes,
      lat: location.latitude, lng: location.longitude,
      photo: photoUri, status: 'Pending Sync', createdAt: new Date().toISOString()
    };

    try {
      const existing = await AsyncStorage.getItem('offlineClients');
      const clientsArray = existing ? JSON.parse(existing) : [];
      clientsArray.push(newClient);
      await AsyncStorage.setItem('offlineClients', JSON.stringify(clientsArray));
      Alert.alert("Success", "Detailed KYC Saved Offline!");
      navigation.goBack();
    } catch (e) { Alert.alert("Error", "Save failed."); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Deep Client KYC</Text>
      
      <Text style={styles.label}>Business Name</Text>
      <TextInput style={styles.input} placeholder="Enter name" value={name} onChangeText={setName} />
      
      <Text style={styles.label}>Business Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
        {businessTypes.map(type => (
          <TouchableOpacity key={type} style={[styles.chip, businessType === type && styles.chipActive]} onPress={() => setBusinessType(type)}>
            <Text style={{color: businessType === type ? 'white' : 'black'}}>{type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Current Contact Role</Text>
      <View style={{flexDirection: 'row', marginBottom: 15}}>
        {roles.map(role => (
          <TouchableOpacity key={role} style={[styles.chip, contactRole === role && styles.chipActive]} onPress={() => setContactRole(role)}>
            <Text style={{color: contactRole === role ? 'white' : 'black'}}>{role}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Contact Phone</Text>
      <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      {contactRole !== 'Owner' && (
        <View>
          <Text style={[styles.label, {color: '#D32F2F'}]}>Actual Owner's Phone (Mandatory)</Text>
          <TextInput style={styles.input} placeholder="Owner's Phone" keyboardType="phone-pad" value={ownerPhone} onChangeText={setOwnerPhone} />
        </View>
      )}

      <Text style={styles.label}>General Observations / Notes</Text>
      <TextInput style={[styles.input, {height: 80}]} multiline placeholder="E.g., Shop is very busy, located near corner..." value={notes} onChangeText={setNotes} />

      <TouchableOpacity style={[styles.gpsBtn, location && {backgroundColor: '#4CAF50'}]} onPress={getRealGPS}>
        <Text style={styles.btnText}>{location ? `✅ GPS: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "📍 Capture Real GPS"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.photoBtn} onPress={openCamera}>
        <Text style={styles.btnText}>{photoUri ? "✅ Storefront Captured" : "📸 Capture Storefront"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveBtn} onPress={saveClient}>
        <Text style={styles.btnText}>Register Detailed KYC</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#D32F2F' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15 },
  chipContainer: { flexDirection: 'row', marginBottom: 15 },
  chip: { backgroundColor: '#ddd', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: '#1976D2' },
  gpsBtn: { backgroundColor: '#1976D2', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  photoBtn: { backgroundColor: '#FF9800', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 40 },
  btnText: { color: 'white', fontWeight: 'bold' }
});

