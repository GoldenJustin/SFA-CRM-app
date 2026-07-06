import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pushLiveVisit } from '../api';

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = deg2rad(lat2 - lat1); const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function deg2rad(deg) { return deg * (Math.PI / 180); }

export default function VisitCheckInScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { clientName } = route.params || {};
    
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [outcome, setOutcome] = useState(null);
    const [reason, setReason] = useState('');
    const [photoBase64, setPhotoBase64] = useState(null);
    const [photoUri, setPhotoUri] = useState(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState('');
    const actionLock = useRef(false);

    useEffect(() => {
        if (route.params?.orderPlaced) setOutcome('order_taken');
    }, [route.params?.orderPlaced]);

    const startVisit = async () => {
        if (actionLock.current) return;
        actionLock.current = true; setLoading(true);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setLoading(false); actionLock.current = false;
            return alert("Location tracking permissions must be granted to check in.");
        }

        try {
            let loc = await Location.getLastKnownPositionAsync({});
            if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            const clientsData = await AsyncStorage.getItem('offlineClients');
            if (clientsData) {
                const clients = JSON.parse(clientsData);
                const targetClient = clients.find(c => c.name === clientName);
                if (targetClient && targetClient.lat && targetClient.lng) {
                    const distKm = getDistanceFromLatLonInKm(loc.coords.latitude, loc.coords.longitude, targetClient.lat, targetClient.lng);
                    const distMeters = Math.round(distKm * 1000);
                    if (distMeters > 200) {
                        setLoading(false); actionLock.current = false;
                        return alert(`Geofence Alert 🛑: You are ${distMeters}m away. Must be within 200m to check in.`);
                    }
                }
            }

            setStartTime(Date.now());
            await AsyncStorage.setItem('activeLat', loc.coords.latitude.toString());
            await AsyncStorage.setItem('activeLng', loc.coords.longitude.toString());
        } catch (e) {
            alert("Could not verify your location coords.");
        } finally {
            setLoading(false); actionLock.current = false;
        }
    };

    const openCamera = async () => {
        let result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri); setPhotoBase64(result.assets[0].base64);
        }
    };

    const handleTakeOrder = async () => {
        const lat = await AsyncStorage.getItem('activeLat');
        const lng = await AsyncStorage.getItem('activeLng');
        navigation.navigate('ProductCatalog', { clientName, visitStartTime: startTime, activeLat: lat, activeLng: lng });
    };

    const endVisit = async () => {
        if (actionLock.current) return;
        if (!outcome) return alert("Please select an outcome to complete this visit.");
        if (outcome === 'no_order' && (!reason || !photoBase64)) return alert("Reason and an evidence photo are required for 'No Order'.");

        actionLock.current = true;
        setIsSaving(true);
        setOverlayMessage('Saving Visit Log...');

        const lat = await AsyncStorage.getItem('activeLat');
        const lng = await AsyncStorage.getItem('activeLng');

        const visitRecord = {
            customer: clientName,
            start_time: new Date(startTime).toISOString().replace('T', ' ').substring(0, 19),
            end_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
            outcome: outcome === 'order_taken' ? 'Order Taken' : 'No Order',
            no_order_reason: reason, photoBase64: photoBase64,
            lat: parseFloat(lat), lng: parseFloat(lng), status: 'Pending Sync'
        };

        try {
            const livePush = await pushLiveVisit(visitRecord);
            if (livePush && livePush.success) visitRecord.status = 'Synced';
        } catch(e) {}

        const existing = await AsyncStorage.getItem('offlineVisits');
        const visitsArray = existing ? JSON.parse(existing) : [];
        visitsArray.push(visitRecord);
        await AsyncStorage.setItem('offlineVisits', JSON.stringify(visitsArray));
        
        await AsyncStorage.removeItem('activeLat');
        await AsyncStorage.removeItem('activeLng');

        setOverlayMessage('Done!');
        setTimeout(() => {
            actionLock.current = false;
            setIsSaving(false);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }, 1500);
    };

    if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#D32F2F" /></View>;

    if (!startTime) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="store-marker" size={50} color="#D32F2F" />
                </View>
                <Text style={styles.title}>{clientName}</Text>
                <Text style={{ color: 'gray', marginBottom: 40, fontSize: 16 }}>Check-in to register your GPS</Text>
                <TouchableOpacity style={styles.startBtn} onPress={startVisit}>
                    <MaterialCommunityIcons name="map-marker-radius" size={24} color="white" style={{ marginRight: 10 }} />
                    <Text style={styles.btnText}>CHECK-IN NOW</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isSaving && (
                <View style={styles.fullScreenOverlay}>
                    <MaterialCommunityIcons name={overlayMessage === 'Done!' ? "check-circle-outline" : "cloud-sync"} size={80} color="white" />
                    <Text style={styles.overlayText}>{overlayMessage}</Text>
                    {overlayMessage !== 'Done!' && <ActivityIndicator size="large" color="white" style={{marginTop: 20}} />}
                </View>
            )}

            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.headerTitle}>Active Visit</Text>
                <Text style={styles.headerSub}>{clientName}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                {!outcome ? (
                    <View style={styles.actionCard}>
                        <Text style={styles.label}>What is the outcome of this visit?</Text>
                        <TouchableOpacity style={styles.orderBtn} onPress={handleTakeOrder}>
                            <View style={styles.btnIconBox}><MaterialCommunityIcons name="cart-plus" size={24} color="#1976D2" /></View>
                            <Text style={styles.orderBtnText}>Take Sales Order</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#1976D2" />
                        </TouchableOpacity>
                        <View style={styles.divider}><View style={styles.line} /><Text style={styles.orText}>OR</Text><View style={styles.line} /></View>
                        <TouchableOpacity style={styles.noOrderBtn} onPress={() => setOutcome('no_order')}>
                            <View style={[styles.btnIconBox, { backgroundColor: '#ffebee' }]}><MaterialCommunityIcons name="flag-variant" size={24} color="#D32F2F" /></View>
                            <Text style={styles.noOrderBtnText}>Flag No Order</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#D32F2F" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.lockedBox}>
                        <MaterialCommunityIcons name={outcome === 'order_taken' ? "check-decagram" : "flag"} size={40} color={outcome === 'order_taken' ? "#4CAF50" : "#D32F2F"} />
                        <Text style={[styles.lockedText, { color: outcome === 'order_taken' ? "#2e7d32" : "#c62828" }]}>
                            {outcome === 'order_taken' ? "Order Placed Successfully" : "No Order Flagged"}
                        </Text>
                        {outcome !== 'order_taken' && (
                            <TouchableOpacity onPress={() => setOutcome(null)} style={{ marginTop: 15, backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }}>
                                <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Change Outcome</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {outcome === 'no_order' && (
                    <View style={styles.noOrderBox}>
                        <Text style={styles.label}>Reason for No Order</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="text-box-edit-outline" size={20} color="gray" style={{ marginRight: 10 }} />
                            <TextInput style={styles.input} placeholder="E.g., Shop Closed, Boss Absent..." value={reason} onChangeText={setReason} />
                        </View>
                        <Text style={[styles.label, { marginTop: 15 }]}>Evidence Photo</Text>
                        <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 150, borderRadius: 12 }} />
                            ) : (
                                <View style={{ alignItems: 'center', padding: 20 }}>
                                    <MaterialCommunityIcons name="camera-plus" size={40} color="#f57c00" />
                                    <Text style={{ color: '#f57c00', fontWeight: 'bold', marginTop: 10 }}>Capture Evidence</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {outcome && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.checkoutBtn} onPress={endVisit}>
                        <Text style={styles.checkoutBtnText}>Checkout & Complete Visit</Text>
                        <MaterialCommunityIcons name="check-all" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(211, 47, 47, 0.95)', zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center' },
    overlayText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 15 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9' },
    iconCircle: { width: 120, height: 120, backgroundColor: '#ffebee', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { backgroundColor: '#D32F2F', padding: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5 },
    headerTitle: { fontSize: 14, color: '#ffcdd2', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    headerSub: { fontSize: 26, fontWeight: 'bold', color: 'white', marginTop: 5 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    startBtn: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 18, borderRadius: 30, width: '90%', alignItems: 'center', justifyContent: 'center', elevation: 5 },
    actionCard: { backgroundColor: 'white', padding: 25, borderRadius: 20, elevation: 2 },
    label: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 15 },
    orderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 15, borderRadius: 15 },
    btnIconBox: { width: 45, height: 45, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    orderBtnText: { flex: 1, color: '#1976D2', fontWeight: 'bold', fontSize: 16 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    line: { flex: 1, height: 1, backgroundColor: '#eee' },
    orText: { marginHorizontal: 15, color: '#aaa', fontWeight: 'bold' },
    noOrderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ffcdd2' },
    noOrderBtnText: { flex: 1, color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
    lockedBox: { backgroundColor: '#e8f5e9', padding: 30, borderRadius: 20, alignItems: 'center', marginVertical: 10, elevation: 2 },
    lockedText: { fontWeight: 'bold', fontSize: 18, marginTop: 15 },
    noOrderBox: { backgroundColor: 'white', padding: 25, borderRadius: 20, marginTop: 15, elevation: 2 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 15, height: 55 },
    input: { flex: 1, fontSize: 15 },
    cameraBtn: { backgroundColor: '#fff3e0', borderRadius: 15, borderWidth: 2, borderColor: '#ffb74d', borderStyle: 'dashed' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderColor: '#eee', elevation: 15 },
    checkoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', paddingVertical: 15, borderRadius: 30 },
    checkoutBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginRight: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
