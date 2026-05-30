import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushLiveOrder } from '../api';

export default function ProductCatalogScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const clientName = route.params?.clientName || "Unknown Client";
  const [orderType, setOrderType] = useState('Sales Order');
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => { loadRealItems(); }, []);

  const loadRealItems = async () => {
    const stored = await AsyncStorage.getItem('offlineItems');
    if (stored) setProducts(JSON.parse(stored));
  };

  const addToCart = (product) => {
    let newCart = { ...cart };
    if (newCart[product.id]) newCart[product.id].qty += 1;
    else newCart[product.id] = { ...product, qty: 1 };
    setCart(newCart);
  };

  const removeFromCart = (product) => {
    let newCart = { ...cart };
    if (newCart[product.id]) {
      newCart[product.id].qty -= 1;
      if (newCart[product.id].qty <= 0) delete newCart[product.id];
    }
    setCart(newCart);
  };

  const handleCheckout = async () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) return Alert.alert("Empty Cart", "Add items first.");
    
    const total = cartItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const newOrder = { id: Date.now().toString(), clientName, total, type: orderType, date: new Date().toISOString(), items: cartItems, status: 'Pending Sync' };

    const livePush = await pushLiveOrder(newOrder);
    console.log('Live Push Result:', livePush);
    
    if (livePush.success) {
      newOrder.status = 'Synced';
      newOrder.erpName = livePush.erpName;
      Alert.alert("Live Sync Success", `${orderType} (${livePush.erpName}) pushed to ERPNext!`);
    } else {
      Alert.alert("Network Issue", "Saved locally. Sync manually later.");
    }

    const existing = await AsyncStorage.getItem('offlineOrders');
    const ordersArray = existing ? JSON.parse(existing) : [];
    ordersArray.push(newOrder);
    await AsyncStorage.setItem('offlineOrders', JSON.stringify(ordersArray));
    navigation.navigate('MainTabs', { screen: 'Orders' });
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
        renderItem={({ item }) => {
          const qty = cart[item.id] ? cart[item.id].qty : 0;
          return (
            <View style={styles.card}>
              <View style={{flex: 1}}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>Tsh {item.price.toLocaleString()}</Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity onPress={() => removeFromCart(item)} style={styles.qtyBtn}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                <Text style={styles.qtyVal}>{qty}</Text>
                <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
        <Text style={styles.cartText}>Total: Tsh {Object.values(cart).reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString()}</Text>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutText}>CONFIRM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  typeSelector: { flexDirection: 'row', padding: 10, backgroundColor: 'white' },
  typeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
  activeBtn: { backgroundColor: '#D32F2F' },
  activeText: { color: 'white', fontWeight: 'bold' },
  inactiveText: { color: 'gray', fontWeight: 'bold' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', marginHorizontal: 15, marginTop: 15, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  price: { color: '#D32F2F', marginTop: 5, fontWeight: 'bold' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', borderRadius: 8 },
  qtyBtn: { paddingHorizontal: 15, paddingVertical: 10 },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  qtyVal: { fontWeight: 'bold', fontSize: 16, marginHorizontal: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20 },
  cartText: { fontSize: 18, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
