import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pushLiveClient } from '../api';
import ModernAlert from '../components/ModernAlert';

export default function NewLeadScreen({ navigation }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('Retail Shop');
    const [contactRole, setContactRole] = useState('Owner');
    const [ownerPhone, setOwnerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'success' });

    const businessTypes = ['Retail Shop', 'Wholesale', 'Supermarket', 'Kiosk', 'Pharmacy'];
    const roles = ['Owner', 'Manager', 'Employee'];

    const triggerToast = (title, message, type = 'success') => {
        setToast({ visible: true, title, message, type });
    };

    const getRealGPS = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return triggerToast('Permission Denied', 'GPS permission is required.', 'error');
        }

        try {
            // High-Speed Strategy: 1. Try cache. 2. Fallback to faster Network Triangulation.
            let loc = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
            if (!loc) {
                loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
            setLocation(loc.coords);
            triggerToast('GPS Captured', 'Coordinates successfully locked.', 'success');
        } catch(e) {
            triggerToast('GPS Error', 'Ensure location services are active.', 'error');
        }
    };

    const openCamera = async () => {
        let result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
        if (!result.canceled) {
            setPhotos(prev => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
        }
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveClient = async () => {
        if (!name || !phone || !location || photos.length === 0) {
            return triggerToast('Required Fields', 'Complete Name, Phone, GPS, and provide an image.', 'error');
        }
        if (contactRole !== 'Owner' && !ownerPhone) {
            return triggerToast('Required Contact', 'Owner phone required when role is Manager/Employee.', 'error');
        }

        setIsSaving(true);
        const clientPayload = {
            id: `LOCAL-${Date.now()}`,
            name, phone, lat: location.latitude, lng: location.longitude,
            businessType, contactRole,
            ownerPhone: contactRole === 'Owner' ? phone : ownerPhone,
            notes, photosBase64: photos.map(p => p.base64), status: 'Pending Sync'
        };

        try {
            const pushRes = await pushLiveClient(clientPayload);
            if (pushRes && pushRes.success) {
                clientPayload.status = 'Synced';
                clientPayload.id = pushRes.erpName;
                triggerToast('Lead Created', 'Client safely stored and live synced on ERPNext!', 'success');
            } else {
                triggerToast('Offline Saved', 'Saved locally. Will auto-sync when online.', 'info');
            }
        } catch (err) {
            triggerToast('Offline Saved', 'Network timeout. Saved to pending sync.', 'info');
        }

        let existing = await AsyncStorage.getItem('offlineClients');
        let clients = existing ? JSON.parse(existing) : [];
        clients.unshift(clientPayload);
        await AsyncStorage.setItem('offlineClients', JSON.stringify(clients));

        setIsSaving(false);
        setTimeout(() => {
            navigation.goBack();
        }, 2000);
    };

    return (
        <View style={styles.container}>
            <ModernAlert visible={toast.visible} title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
            <View style={styles.headerArea}>
                <Text style={styles.headerTitle}>New Client KYC</Text>
                <Text style={styles.headerSub}>Fieldforce Onboarding Engine</Text>
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
                        <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                    </View>
                    
                    <Text style={styles.subLabel}>Business Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {businessTypes.map(type => (
                            <TouchableOpacity key={type} style={[styles.chip, businessType === type && styles.chipActive]} onPress={() => setBusinessType(type)}>
                                <Text style={{ color: businessType === type ? 'white' : '#555', fontWeight: '500' }}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>On-Site Contact Identity</Text>
                    <View style={styles.rowChips}>
                        {roles.map(role => (
                            <TouchableOpacity key={role} style={[styles.chip, contactRole === role && styles.chipActive]} onPress={() => setContactRole(role)}>
                                <Text style={{ color: contactRole === role ? 'white' : '#555', fontWeight: '500' }}>{role}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {contactRole !== 'Owner' && (
                        <View style={[styles.inputWrapper, { borderColor: '#D32F2F', borderWidth: 1 }]}>
                            <MaterialCommunityIcons name="phone-alert" size={20} color="#D32F2F" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Owner Phone" keyboardType="phone-pad" value={ownerPhone} onChangeText={setOwnerPhone} />
                        </View>
                    )}
                    <Text style={styles.subLabel}>Observations / Notes</Text>
                    <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <TextInput style={[styles.input, { textAlignVertical: 'top' }]} placeholderTextColor="#888" multiline placeholder="Enter notes..." value={notes} onChangeText={setNotes} />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Location & Photos</Text>
                    <TouchableOpacity style={[styles.gpsBtn, location && { backgroundColor: '#e8f5e9', borderColor: '#4CAF50' }]} onPress={getRealGPS}>
                        <MaterialCommunityIcons name={location ? "check-circle" : "map-marker-radius"} size={24} color={location ? "#4CAF50" : "#D32F2F"} style={{ marginRight: 10 }} />
                        <Text style={{ color: location ? "#4CAF50" : "#D32F2F", fontWeight: 'bold', fontSize: 15 }}>
                            {location ? "GPS Lock Established" : "Capture Location GPS"}
                        </Text>
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 5 }}>
                        <TouchableOpacity style={styles.addPhotoBox} onPress={openCamera}>
                            <MaterialCommunityIcons name="camera-plus" size={35} color="#D32F2F" />
                            <Text style={{ color: '#D32F2F', fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>Add Storefront</Text>
                        </TouchableOpacity>
                        {photos.map((p, idx) => (
                            <View key={idx} style={styles.imgWrapper}>
                                <Image source={{ uri: p.uri }} style={styles.imgThumb} />
                                <View style={styles.imgBadge}><Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>{idx === 0 ? "STOREFRONT" : "EXTRA"}</Text></View>
                                <TouchableOpacity style={styles.removeImgBtn} onPress={() => removePhoto(idx)}>
                                    <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
            
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveClient} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>ONBOARD CLIENT</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f2' },
    headerArea: { backgroundColor: '#D32F2F', padding: 25, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    headerSub: { color: '#ffcdd2', fontSize: 13, marginTop: 5 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 1 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    subLabel: { fontSize: 13, fontWeight: 'bold', color: '#777', marginBottom: 10 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#333' },
    rowChips: { flexDirection: 'row', marginBottom: 15 },
    chip: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
    chipActive: { backgroundColor: '#D32F2F' },
    gpsBtn: { flexDirection: 'row', backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    addPhotoBox: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffebee', marginRight: 10 },
    imgWrapper: { position: 'relative', marginRight: 10 },
    imgThumb: { width: 100, height: 100, borderRadius: 12 },
    imgBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
    removeImgBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 15, elevation: 10, borderTopWidth: 1, borderColor: '#eee' },
    saveBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
