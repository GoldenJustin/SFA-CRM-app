import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PipelineScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [totalVal, setTotalVal] = useState(0);

  useFocusEffect(useCallback(() => { loadOrders(); }, []));

  const loadOrders = async () => {
    try {
      const storedOrders = await AsyncStorage.getItem('offlineOrders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        setOrders(parsed);
        // FIX: Added Number() fallback to prevent toLocaleString crashes
        setTotalVal(parsed.reduce((sum, o) => sum + (Number(o.total) || 0), 0));
      }
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetails', { order: item })}>
      <View style={styles.cardHeader}>
        <Text style={styles.client} numberOfLines={1}>{item.clientName}</Text>
        <Text style={styles.amount}>Tsh {(Number(item.total) || 0).toLocaleString()}</Text>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.typeBadge}><Text style={styles.typeText}>{item.type}</Text></View>
        <View style={[styles.statusBadge, {backgroundColor: item.status === 'Synced' ? '#e8f5e9' : '#ffebee'}]}>
          <Text style={[styles.statusText, {color: item.status === 'Synced' ? '#2e7d32' : '#c62828'}]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>Total Pipeline: Tsh {(Number(totalVal) || 0).toLocaleString()}</Text>
      </View>
      {orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="cart-off" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No orders placed yet.</Text>
        </View>
      ) : (
        <FlatList 
          data={orders} 
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} 
          renderItem={renderItem} 
          contentContainerStyle={{padding: 15, paddingBottom: 100}} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#D32F2F', padding: 25, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 15, color: '#ffcdd2', marginTop: 5, fontWeight: 'bold' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'gray', marginTop: 10, fontSize: 16 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  client: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
  amount: { fontSize: 18, fontWeight: '900', color: '#D32F2F' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 10 },
  typeText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 12, color: 'gray', textAlign: 'right' }
});
