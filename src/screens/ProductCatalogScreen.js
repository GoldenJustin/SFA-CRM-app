import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProductCatalogScreen({ navigation, route }) {
  const clientName = route.params?.clientName || "Unknown Client";
  const [orderType, setOrderType] = useState('Sales Order');
  const [cart, setCart] = useState([]);

  const products = [
    { id: '1', name: 'Cherry Premium Pack', price: 120.00 },
    { id: '2', name: 'Standard Widget', price: 45.00 },
  ];

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return Alert.alert("Empty Cart", "Add items first.");
    
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const newOrder = {
      id: Date.now().toString(), clientName, total, type: orderType, date: new Date().toISOString()
    };

    try {
      const existing = await AsyncStorage.getItem('offlineOrders');
      const ordersArray = existing ? JSON.parse(existing) : [];
      ordersArray.push(newOrder);
      await AsyncStorage.setItem('offlineOrders', JSON.stringify(ordersArray));
      
      Alert.alert("Success", `${orderType} saved locally!`);
      navigation.navigate('MainTabs', { screen: 'Pipeline' }); // Jump straight to pipeline to see it
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.typeSelector}>
        <TouchableOpacity style={[styles.typeBtn, orderType === 'Sales Order' && styles.activeBtn]} onPress={() => setOrderType('Sales Order')}>
          <Text style={orderType === 'Sales Order' ? styles.activeText : styles.inactiveText}>Sales Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeBtn, orderType === 'Quotation' && styles.activeBtn]} onPress={() => setOrderType('Quotation')}>
          <Text style={orderType === 'Quotation' ? styles.activeText : styles.inactiveText}>Quotation</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
              <Text style={styles.addText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      
      <View style={styles.footer}>
        <Text style={styles.cartText}>Total: ${cart.reduce((s, i) => s + i.price, 0).toFixed(2)}</Text>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutText}>CONFIRM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  typeSelector: { flexDirection: 'row', padding: 10, backgroundColor: 'white', elevation: 2 },
  typeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
  activeBtn: { backgroundColor: '#D32F2F' },
  activeText: { color: 'white', fontWeight: 'bold' },
  inactiveText: { color: 'gray', fontWeight: 'bold' },
  card: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', marginHorizontal: 15, marginTop: 15, borderRadius: 12, elevation: 2 },
  name: { fontSize: 16, fontWeight: 'bold' },
  price: { color: '#333', marginTop: 5 },
  addBtn: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, justifyContent: 'center' },
  addText: { fontWeight: 'bold', color: '#1976D2' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, elevation: 10 },
  cartText: { fontSize: 18, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

