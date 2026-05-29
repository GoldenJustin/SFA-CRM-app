import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ClientListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);

  useFocusEffect(
    useCallback(() => { loadClients(); }, [])
  );

  const loadClients = async () => {
    try {
      const storedClients = await AsyncStorage.getItem('offlineClients');
      if (storedClients) setClients(JSON.parse(storedClients));
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientPhone}>{item.phone}</Text>
        <Text style={{ color: item.status === 'Pending Sync' ? '#FF9800' : 'green', fontSize: 12 }}>{item.status}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('VisitCheckIn', { clientName: item.name })}>
        <MaterialCommunityIcons name="map-marker-distance" size={24} color="#D32F2F" />
        <Text style={styles.iconText}>Visit</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="gray" />
        <TextInput style={styles.searchInput} placeholder="Search Customers..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <FlatList
        data={clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewLead')}>
        <MaterialCommunityIcons name="account-plus" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, marginBottom: 15 },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 10, fontSize: 16 },
  card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 2 },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  clientPhone: { color: 'gray', marginTop: 4 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee', padding: 10, borderRadius: 8 },
  iconText: { marginLeft: 5, fontWeight: 'bold', color: '#D32F2F' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#D32F2F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
