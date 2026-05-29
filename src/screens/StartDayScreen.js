import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StartDayScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkDayStatus(); }, []);

  const checkDayStatus = async () => {
    const status = await AsyncStorage.getItem('dayStarted');
    if (status === 'true') navigation.replace('MainTabs');
    setLoading(false);
  };

  const handleStartDay = async () => {
    await AsyncStorage.setItem('dayStarted', 'true');
    navigation.replace('MainTabs');
  };

  if (loading) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="clock-start" size={80} color="#D32F2F" />
        <Text style={styles.title}>Start Your Shift</Text>
        <Text style={styles.subtitle}>You must record daily attendance before accessing routes or clients.</Text>
        <TouchableOpacity style={styles.startDayBtn} onPress={handleStartDay}>
          <Text style={styles.btnText}>CLOCK IN & FETCH ROUTES</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f4f4' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 15 },
  subtitle: { color: 'gray', marginBottom: 30, textAlign: 'center' },
  startDayBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
