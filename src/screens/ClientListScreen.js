import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ClientListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);

  useFocusEffect(useCallback(() => { loadClients(); }, []));

  const loadClients = async () => {
    try {
      const storedClients = await AsyncStorage.getItem('offlineClients');
      if (storedClients) setClients(JSON.parse(storedClients));
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ClientProfile', { client: item })}>
      {item.image ? (
        <Image source={{uri: item.image}} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitials}>{item.name.substring(0,2).toUpperCase()}</Text></View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientSub}>{item.businessType || 'Customer'} • {item.phone}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Clients</Text>
      </View>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="gray" />
        <TextInput style={styles.searchInput} placeholder="Search clients..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <FlatList
        data={clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewLead')}>
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, marginHorizontal: 15, paddingHorizontal: 15, marginBottom: 15, height: 50, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarInitials: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  clientSub: { color: 'gray', fontSize: 13, marginTop: 4 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#D32F2F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
