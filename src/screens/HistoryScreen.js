import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      let v = await AsyncStorage.getItem('offlineVisits');
      let o = await AsyncStorage.getItem('offlineOrders');
      let visits = v ? JSON.parse(v).map(x => ({...x, _type: 'Visit', time: x.start_time})) : [];
      let orders = o ? JSON.parse(o).map(x => ({...x, _type: 'Order', time: x.date})) : [];
      
      const allData = [...visits, ...orders].sort((a,b) => new Date(b.time) - new Date(a.time));
      setData(allData);
    };
    loadHistory();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity History</Text>
      {data.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity found.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name={item._type === 'Order' ? 'cart' : 'map-marker'} size={24} color="white" />
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{item._type}: {item.customer || item.clientName}</Text>
                <Text style={styles.date}>{new Date(item.time).toLocaleString()}</Text>
              </View>
              <View style={[styles.badge, {backgroundColor: item.status === 'Synced' ? '#e8f5e9' : '#ffebee'}]}>
                <Text style={{color: item.status === 'Synced' ? '#2e7d32' : '#c62828', fontWeight:'bold', fontSize:12}}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  emptyText: { textAlign: 'center', color: 'gray', marginTop: 50 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderRadius: 12, marginBottom: 12, elevation: 1 },
  iconBox: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  info: { flex: 1 },
  title: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  date: { fontSize: 12, color: 'gray', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 }
});
