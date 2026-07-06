import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullMasterData } from '../api';
import ModernAlert from '../components/ModernAlert';

export default function StartDayScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => { checkDayStatus(); }, []);

  const triggerToast = (title, message, type = 'success') => {
    setToast({ visible: true, title, message, type });
  };

  const checkDayStatus = async () => {
    const status = await AsyncStorage.getItem('dayStarted');
    if (status === 'true') navigation.replace('MainTabs');
    setLoading(false);
  };

  const handleStartDay = async () => {
    setIsPulling(true);
    console.log("[SHIFT]: Starting shift initialization...");
    
    await AsyncStorage.removeItem('offlineOrders');
    await AsyncStorage.removeItem('offlineVisits');
    
    const result = await pullMasterData();
    setIsPulling(false);
    
    if (!result.success) {
      triggerToast("Offline Mode ⚠️", "Could not reach ERPNext. Starting shift with previously saved route cache.", "info");
      setTimeout(async () => {
        await AsyncStorage.setItem('dayStarted', 'true');
        navigation.replace('MainTabs');
      }, 2500);
    } else {
      triggerToast("Shift Active ✅", "Route profile loaded. Shift started.", "success");
      setTimeout(async () => {
        await AsyncStorage.setItem('dayStarted', 'true');
        navigation.replace('MainTabs');
      }, 2000);
    }
  };

  if (loading) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernAlert 
        visible={toast.visible} 
        title={toast.title} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="clock-start" size={80} color="#D32F2F" />
        <Text style={styles.title}>Start Your Shift</Text>
        <Text style={styles.subtitle}>Clock in to download today's assigned routes and product pricing.</Text>
        
        <TouchableOpacity style={styles.startDayBtn} onPress={handleStartDay} disabled={isPulling}>
          {isPulling ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="white" style={{ marginRight: 10 }} />
              <Text style={styles.btnText}>FETCHING DATA...</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>CLOCK IN & FETCH DATA</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f4f4' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 15 },
  subtitle: { color: 'gray', marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 },
  startDayBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
