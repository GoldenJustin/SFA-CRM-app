import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loginToERP } from '../api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Required", "Enter email and password.");

    setLoading(true);
    const result = await loginToERP(email, password);
    setLoading(false);

    if (result.success) {
      Alert.alert("Logged In", `Welcome ${result.user}!`);
      navigation.replace('StartDay');
    } else {
      Alert.alert("Login Failed", result.error);
    }
  };

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="fruit-cherries" size={80} color="#D32F2F" />
      <Text style={styles.title}>CHERRY CRM</Text>
      <Text style={styles.subtitle}>Sales Force Automation</Text>

      <Text style={styles.label}>ERPNext Email</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="account" size={20} color="gray" />
        <TextInput style={styles.input} placeholder="sales@cherry.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock" size={20} color="gray" />
        <TextInput style={styles.input} placeholder="********" secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
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
  input: { flex: 1, paddingVertical: 15, marginLeft: 10, fontSize: 16 },
  loginBtn: { backgroundColor: '#D32F2F', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});

