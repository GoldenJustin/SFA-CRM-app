import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function PipelineScreen({ navigation }) {
  const [orders, setOrders] = useState([]);

  useFocusEffect(
    useCallback(() => { loadOrders(); }, [])
  );

  const loadOrders = async () => {
    try {
      const storedOrders = await AsyncStorage.getItem('offlineOrders');
      if (storedOrders) setOrders(JSON.parse(storedOrders));
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetails', { order: item })}>
      <View style={styles.row}>
        <Text style={styles.client}>{item.clientName}</Text>
        <Text style={styles.amount}>Tsh {item.total.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: item.type === 'Quotation' ? '#FF9800' : '#4CAF50' }]}>
          <Text style={styles.badgeText}>{item.type}</Text>
        </View>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>My Pipeline</Text>
      {orders.length === 0 ? (
        <Text style={{textAlign: 'center', color: 'gray', marginTop: 50}}>No orders placed yet.</Text>
      ) : (
        <FlatList data={orders} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={{paddingBottom: 20}} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, marginLeft: 5 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  client: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  date: { color: 'gray', fontSize: 12 }
});
