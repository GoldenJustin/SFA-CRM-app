import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogBox } from 'react-native';

// Suppress the Expo FileSystem warning
LogBox.ignoreLogs(['Method downloadAsync imported from "expo-file-system"']);

export default function OrderDetailsScreen({ route }) {
  const { order } = route.params;

  const downloadPDF = async () => {
    if (order.status !== 'Synced' || !order.erpName) return Alert.alert("Offline", "Sync the order to ERPNext first to generate an official PDF.");
    try {
      const url = await AsyncStorage.getItem('erp_url');
      const sid = await AsyncStorage.getItem('erp_sid');
      const baseUrl = url ? url.replace(/\/$/, "") : 'http://server.royal.co.tz:8092';
      const doctype = order.type === 'Quotation' ? 'Quotation' : 'Sales Order';
      
      const pdfUrl = `${baseUrl}/api/method/frappe.utils.print_format.download_pdf?doctype=${doctype}&name=${order.erpName}&format=Standard&no_letterhead=0`;
      const fileUri = `${FileSystem.documentDirectory}${order.erpName}.pdf`;
      
      Alert.alert("Downloading", "Fetching official PDF document...");
      const { uri } = await FileSystem.downloadAsync(pdfUrl, fileUri, { headers: { 'Cookie': `sid=${sid}` } });
      await Sharing.shareAsync(uri);
    } catch(e) { Alert.alert("Error", "Download failed. Check connection."); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{order.type}</Text>
          <Text style={styles.subtitle}>{order.erpName || 'Pending Sync'}</Text>
        </View>
        <View style={[styles.badge, {backgroundColor: order.status === 'Synced' ? '#e8f5e9' : '#ffebee'}]}>
          <Text style={{color: order.status === 'Synced' ? '#2e7d32' : '#c62828', fontWeight:'bold'}}>{order.status}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Client Name</Text>
        <Text style={styles.value}>{order.clientName}</Text>
        <Text style={[styles.label, {marginTop: 15}]}>Total Value</Text>
        <Text style={styles.amount}>Tsh {(Number(order.total) || 0).toLocaleString()}</Text>
      </View>
      <Text style={styles.itemsHeader}>Order Items</Text>
      <FlatList
        data={order.items}
        keyExtractor={(i, index) => i.item_code || index.toString()}
        renderItem={({item}) => {
          // FIX: Map Offline 'name' and 'price' correctly
          const itemName = item.item_name || item.name;
          const itemRate = Number(item.rate || item.price) || 0;
          const itemQty = Number(item.qty) || 0;
          
          return (
            <View style={styles.itemRow}>
              <View style={{flex: 1}}>
                <Text style={styles.itemName}>{itemName}</Text>
                <Text style={styles.itemMeta}>{itemQty} x Tsh {itemRate.toLocaleString()}</Text>
              </View>
              <Text style={styles.itemTotal}>Tsh {(itemQty * itemRate).toLocaleString()}</Text>
            </View>
          );
        }}
      />
      <TouchableOpacity style={styles.downloadBtn} onPress={downloadPDF}>
        <MaterialCommunityIcons name="file-pdf-box" size={24} color="white" style={{marginRight: 10}} />
        <Text style={styles.btnText}>Download ERPNext PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: 'gray', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 25 },
  label: { fontSize: 12, color: 'gray', fontWeight: 'bold' },
  value: { fontSize: 18, color: '#333', fontWeight: 'bold', marginTop: 2 },
  amount: { fontSize: 24, color: '#D32F2F', fontWeight: '900', marginTop: 2 },
  itemsHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  itemMeta: { fontSize: 13, color: 'gray', marginTop: 4 },
  itemTotal: { fontSize: 16, fontWeight: 'bold', color: '#D32F2F' },
  downloadBtn: { flexDirection: 'row', backgroundColor: '#1976D2', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
