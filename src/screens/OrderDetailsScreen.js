import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrderDetailsScreen({ route }) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();

  const printERPNextPDF = async () => {
    if (order.status !== 'Synced' || !order.erpName) {
      return Alert.alert("Offline", "Sync this document to ERPNext first to generate the official PDF.");
    }
    
    // Construct the direct ERPNext PDF download URL
    const url = await AsyncStorage.getItem('erp_url');
    const cleanUrl = url.replace(/\/$/, "");
    const pdfUrl = `${cleanUrl}/api/method/frappe.utils.print_format.download_pdf?doctype=${order.type === 'Quotation' ? 'Quotation' : 'Sales Order'}&name=${order.erpName}&format=Standard&no_letterhead=0`;
    
    Alert.alert("Downloading", "Opening ERPNext PDF...");
    Linking.openURL(pdfUrl); // Uses built-in React Native Linking!
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{order.type}</Text>
        <Text style={styles.client}>{order.clientName}</Text>
        <Text style={{color: order.status === 'Synced' ? 'green' : '#FF9800', fontWeight: 'bold', marginTop: 5}}>
          {order.status} {order.erpName ? `(${order.erpName})` : ''}
        </Text>
      </View>

      <FlatList
        data={order.items}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.qty}x @ Tsh {item.price.toLocaleString()}</Text>
            <Text style={styles.itemTotal}>Tsh {(item.qty * item.price).toLocaleString()}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        <Text style={styles.totalText}>Grand Total: Tsh {order.total.toLocaleString()}</Text>
        <TouchableOpacity style={styles.printBtn} onPress={printERPNextPDF}>
          <Text style={styles.printText}>Download ERPNext PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { backgroundColor: 'white', padding: 20, marginBottom: 10, elevation: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#D32F2F' },
  client: { fontSize: 16, color: '#333', marginTop: 5 },
  itemCard: { backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 8 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemSub: { color: 'gray', marginTop: 5 },
  itemTotal: { position: 'absolute', right: 15, top: 15, fontWeight: 'bold', color: '#333' },
  footer: { backgroundColor: 'white', padding: 20, elevation: 10 },
  totalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  printBtn: { backgroundColor: '#1976D2', padding: 15, borderRadius: 8, alignItems: 'center' },
  printText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
