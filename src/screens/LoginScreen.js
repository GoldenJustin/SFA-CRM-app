import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="fruit-cherries" size={80} color="#D32F2F" />
      <Text style={styles.title}>CHERRY CRM</Text>
      <Text style={styles.subtitle}>Field Sales Execution</Text>

      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="account" size={20} color="gray" />
        <TextInput style={styles.input} placeholder="ERPNext Username / Email" />
      </View>

      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock" size={20} color="gray" />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      </View>

      <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.replace('MainTabs')}>
        <Text style={styles.loginText}>LOGIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f4', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#D32F2F', marginTop: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', width: '100%', paddingHorizontal: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  input: { flex: 1, paddingVertical: 15, marginLeft: 10, fontSize: 16 },
  loginBtn: { backgroundColor: '#D32F2F', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
