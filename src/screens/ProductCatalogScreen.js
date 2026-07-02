import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pushLiveOrder } from '../api';

export default function ProductCatalogScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { clientName } = route.params || { clientName: "Unknown" };
  const [orderType, setOrderType] = useState('Sales Order');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadRealItems = async () => {
      const stored = await AsyncStorage.getItem('offlineItems');
      if (stored) setProducts(JSON.parse(stored));
    };
    loadRealItems();
  }, []);

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
    
    const total = cartItems.reduce((sum, i) => sum + ((Number(i.price)||0) * i.qty), 0);
    const newOrder = { id: Date.now().toString(), clientName, total, type: orderType, date: new Date().toISOString(), items: cartItems, status: 'Pending Sync' };
    
    const livePush = await pushLiveOrder(newOrder);
    if (livePush.success) { newOrder.status = 'Synced'; newOrder.erpName = livePush.erpName; }
    
    let existing = await AsyncStorage.getItem('offlineOrders');
    let ordersArray = existing ? JSON.parse(existing) : [];
    ordersArray.unshift(newOrder);
    await AsyncStorage.setItem('offlineOrders', JSON.stringify(ordersArray));

    // Route back to the Visit screen so they can press 'Complete Visit'
    navigation.navigate('VisitCheckIn', { orderPlaced: true, clientName });
  };

  const totalValue = Object.values(cart).reduce((s, i) => s + ((Number(i.price)||0) * i.qty), 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Catalog</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{clientName}</Text>
        </View>

        <View style={styles.typeSelector}>
          <TouchableOpacity style={[styles.typeBtn, orderType === 'Sales Order' && styles.activeBtn]} onPress={() => setOrderType('Sales Order')}>
            <Text style={orderType === 'Sales Order' ? styles.activeText : styles.inactiveText}>Sales Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeBtn, orderType === 'Quotation' && styles.activeBtn]} onPress={() => setOrderType('Quotation')}>
            <Text style={orderType === 'Quotation' ? styles.activeText : styles.inactiveText}>Quotation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="gray" />
          <TextInput style={styles.searchInput} placeholder="Search items..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <FlatList
        data={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 5 }}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
        renderItem={({ item }) => {
          const qty = cart[item.id] ? cart[item.id].qty : 0;
          return (
            <View style={styles.gridCard}>
              <View style={styles.imageBox}><MaterialCommunityIcons name="package-variant" size={30} color="#ccc" /></View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productPrice}>Tsh {(Number(item.price)||0).toLocaleString()}</Text>
              
              {qty === 0 ? (
                <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                  <Text style={styles.addBtnText}>+ ADD</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => removeFromCart(item)} style={styles.stepBtn}><Text style={styles.stepText}>-</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <TouchableOpacity onPress={() => addToCart(item)} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {totalValue > 0 && (
        <View style={styles.bottomCart}>
          <View>
            <Text style={styles.cartLabel}>Total ({Object.keys(cart).length} Items)</Text>
            <Text style={styles.cartValue}>Tsh {totalValue.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Checkout</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { backgroundColor: '#D32F2F', paddingHorizontal: 15, paddingBottom: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#ffcdd2', fontSize: 13, fontWeight: 'bold', maxWidth: '50%', textAlign: 'right' },
  typeSelector: { flexDirection: 'row', backgroundColor: '#c62828', borderRadius: 8, padding: 3, marginBottom: 10 },
  typeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  activeBtn: { backgroundColor: 'white' },
  activeText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 13 },
  inactiveText: { color: '#ffcdd2', fontWeight: 'bold', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  gridCard: { flex: 1, backgroundColor: 'white', margin: 5, borderRadius: 12, padding: 10, alignItems: 'center', elevation: 1 },
  imageBox: { width: 50, height: 50, backgroundColor: '#f9f9f9', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center', height: 35 },
  productPrice: { color: '#D32F2F', fontWeight: '900', marginTop: 2, marginBottom: 10, fontSize: 13 },
  addBtn: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#D32F2F', borderRadius: 15, paddingHorizontal: 20, paddingVertical: 6, width: '100%', alignItems: 'center' },
  addBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 15, justifyContent: 'space-between', width: '100%', paddingHorizontal: 5 },
  stepBtn: { padding: 5 },
  stepText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F' },
  bottomCart: { position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: '#212121', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, elevation: 15 },
  cartLabel: { color: '#aaa', fontSize: 12, fontWeight:'bold' },
  cartValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginRight: 2 }
});
