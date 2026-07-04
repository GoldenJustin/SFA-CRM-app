import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginToERP, authFetch } from '../api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true); // Start true while checking session
  const [settings, setSettings] = useState({ company_name: "SFA App", logo_url: null });

  useEffect(() => { 
    checkExistingSession();
    loadSettings(); 
  }, []);

  const checkExistingSession = async () => {
    try {
      const sid = await AsyncStorage.getItem('erp_sid');
      const dayStarted = await AsyncStorage.getItem('dayStarted');
      
      if (sid) {
        // User is logged in. Skip login screen!
        if (dayStarted === 'true') {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('StartDay');
        }
      } else {
        setLoading(false); // No session, show login form
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await authFetch('/api/method/sfa_crm.api.get_sfa_settings');
      if (res.message) {
        setSettings(res.message);
        await AsyncStorage.setItem('sfaSettings', JSON.stringify(res.message));
      }
    } catch(e) {}
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Required", "Enter email and password.");
    setLoading(true);
    const result = await loginToERP(email, password);
    
    if (result.success) {
      await loadSettings();
      navigation.replace('StartDay');
    } else {
      Alert.alert("Login Failed", result.error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={{marginTop: 10, color: '#333'}}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {settings.logo_url ? (
        <Image source={{uri: settings.logo_url}} style={{width: 120, height: 120, alignSelf: 'center', marginBottom: 20}} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name="briefcase-account" size={80} color="#D32F2F" style={{alignSelf:'center'}} />
      )}
      
      <Text style={styles.title}>{settings.company_name}</Text>
      <Text style={styles.subtitle}>Field Sales Automation</Text>
      
      <Text style={styles.label}>Email</Text>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#888" 
          placeholder="sales@company.com" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
          keyboardType="email-address" 
        />
      </View>
      
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#888" 
          placeholder="********" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
          autoCapitalize="none" 
        />
      </View>
      
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginText}>LOGIN</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#f4f4f4', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#D32F2F', marginTop: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 40, textAlign: 'center' },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#333' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', width: '100%', paddingHorizontal: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  loginBtn: { backgroundColor: '#D32F2F', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
