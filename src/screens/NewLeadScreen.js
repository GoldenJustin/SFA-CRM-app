import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NewLeadScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('Retail Shop');
  const [contactRole, setContactRole] = useState('Owner');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);

  const businessTypes = ['Retail Shop', 'Wholesale', 'Supermarket', 'Kiosk', 'Pharmacy'];
  const roles = ['Owner', 'Manager', 'Employee'];

  const getRealGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'GPS Permission Denied');
    try {
      let loc = await Location.getLastKnownPositionAsync({});
      if(!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      setLocation(loc.coords);
    } catch(e) { Alert.alert('GPS Error', 'Could not fetch GPS.'); }
  };

  const openCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
    if (!result.canceled) setPhotos(prev => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const saveClientLocally = async () => {
    if (!name || !phone || !location || photos.length === 0) return Alert.alert("Required", "Name, Phone, GPS, and at least 1 Photo are required.");
    if (contactRole !== 'Owner' && !ownerPhone) return Alert.alert("Required", "Owner's Phone is required.");

    const newClient = { 
      id: `LOCAL-${Date.now()}`, 
      name, phone, lat: location.latitude, lng: location.longitude, 
      businessType, contactRole, ownerPhone, notes, 
      photosBase64: photos.map(p => p.base64),
      status: 'Pending Sync'
    };

    let existing = await AsyncStorage.getItem('offlineClients');
    let clients = existing ? JSON.parse(existing) : [];
    clients.unshift(newClient);
    await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));
    
    Alert.alert("Saved Locally", "Client saved offline. It will be pushed to the server during Sync.");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>New Client KYC</Text>
        <Text style={styles.headerSub}>Fill in client details accurately</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Business Information</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="storefront" size={20} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Business Name" value={name} onChangeText={setName} />
          </View>
          
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="phone" size={20} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Phone Number (07...)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>

          <Text style={styles.subLabel}>Business Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
            {businessTypes.map(type => (
              <TouchableOpacity key={type} style={[styles.chip, businessType === type && styles.chipActive]} onPress={() => setBusinessType(type)}>
                <Text style={{color: businessType === type ? 'white' : '#555', fontWeight:'500'}}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contact Person</Text>
          <View style={styles.rowChips}>
            {roles.map(role => (
              <TouchableOpacity key={role} style={[styles.chip, contactRole === role && styles.chipActive]} onPress={() => setContactRole(role)}>
                <Text style={{color: contactRole === role ? 'white' : '#555', fontWeight:'500'}}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {contactRole !== 'Owner' && (
            <View style={[styles.inputWrapper, {borderColor: '#D32F2F', borderWidth: 1}]}>
              <MaterialCommunityIcons name="phone-alert" size={20} color="#D32F2F" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Actual Owner's Phone *" keyboardType="phone-pad" value={ownerPhone} onChangeText={setOwnerPhone} />
            </View>
          )}

          <Text style={[styles.label, {marginTop: 15}]}>Observations / Notes</Text>
          <View style={[styles.inputWrapper, {height: 80, alignItems: 'flex-start', paddingTop: 10}]}>
            <TextInput style={[styles.input, {textAlignVertical: 'top'}]} placeholderTextColor="#888" multiline placeholder="E.g., Shop is busy..." value={notes} onChangeText={setNotes} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Location & Evidence</Text>
          <TouchableOpacity style={[styles.gpsBtn, location && {backgroundColor: '#e8f5e9', borderColor: '#4CAF50'}]} onPress={getRealGPS}>
            <MaterialCommunityIcons name={location ? "check-circle" : "map-marker-radius"} size={24} color={location ? "#4CAF50" : "#D32F2F"} style={{marginRight: 10}}/>
            <Text style={{color: location ? "#4CAF50" : "#D32F2F", fontWeight: 'bold', fontSize: 16}}>
              {location ? "GPS Captured Successfully" : "Tap to Capture GPS"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.subLabel}>Photos (First is Storefront)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', marginTop: 5}}>
            <TouchableOpacity style={styles.addPhotoBox} onPress={openCamera}>
              <MaterialCommunityIcons name="camera-plus" size={35} color="#D32F2F" />
              <Text style={{color: '#D32F2F', fontSize: 10, marginTop: 5, fontWeight:'bold'}}>Add Photo</Text>
            </TouchableOpacity>
            
            {photos.map((p, idx) => (
              <View key={idx} style={styles.imgWrapper}>
                <Image source={{uri: p.uri}} style={styles.imgThumb} />
                <View style={styles.imgBadge}><Text style={{color:'white', fontSize: 8, fontWeight:'bold'}}>{idx === 0 ? "STOREFRONT" : "EXTRA"}</Text></View>
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => removePhoto(idx)}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={saveClientLocally}>
          <Text style={styles.saveBtnText}>Save Offline Client</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  headerArea: { backgroundColor: '#D32F2F', padding: 25, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#ffcdd2', fontSize: 14, marginTop: 5 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 1 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  subLabel: { fontSize: 13, fontWeight: 'bold', color: '#777', marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  rowChips: { flexDirection: 'row', marginBottom: 15 },
  chip: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: '#D32F2F' },
  gpsBtn: { flexDirection:'row', backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent:'center', marginBottom: 20 },
  addPhotoBox: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffebee', marginRight: 10 },
  imgWrapper: { position: 'relative', marginRight: 10 },
  imgThumb: { width: 100, height: 100, borderRadius: 12 },
  imgBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  removeImgBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 15, elevation: 10, borderTopWidth: 1, borderColor: '#eee' },
  saveBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
