import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pushLiveOrder, pushLiveVisit } from '../api';

export default function ProductCatalogScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { clientName, visitStartTime, activeLat, activeLng } = route.params || { clientName: "Unknown" };
    
    const [orderType, setOrderType] = useState('Sales Order');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState({});
    const [products, setProducts] = useState([]);
    
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState('');
    const checkoutLock = useRef(false);

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
        if (checkoutLock.current) return;
        const cartItems = Object.values(cart);
        if (cartItems.length === 0) return alert("Empty Cart: Add items first.");
        
        checkoutLock.current = true;
        setIsCheckingOut(true);
        setOverlayMessage('Saving Order...');
        
        const total = cartItems.reduce((sum, i) => sum + ((Number(i.price)||0) * i.qty), 0);
        const newOrder = {
            id: Date.now().toString(),
            clientName, total, type: orderType,
            date: new Date().toISOString(),
            items: cartItems, status: 'Pending Sync'
        };

        try {
            const orderPush = await pushLiveOrder(newOrder);
            if (orderPush && orderPush.success) {
                newOrder.status = 'Synced';
                newOrder.erpName = orderPush.erpName;
            }
        } catch(e) {}

        let existingOrders = await AsyncStorage.getItem('offlineOrders');
        let ordersArray = existingOrders ? JSON.parse(existingOrders) : [];
        ordersArray.unshift(newOrder);
        await AsyncStorage.setItem('offlineOrders', JSON.stringify(ordersArray));

        if (visitStartTime) {
            setOverlayMessage('Finalizing Visit...');
            const visitRecord = {
                customer: clientName,
                start_time: new Date(visitStartTime).toISOString().replace('T', ' ').substring(0, 19),
                end_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                outcome: 'Order Taken', no_order_reason: '', photoBase64: null,
                lat: parseFloat(activeLat), lng: parseFloat(activeLng), status: 'Pending Sync'
            };

            try {
                const visitPush = await pushLiveVisit(visitRecord);
                if (visitPush && visitPush.success) {
                    visitRecord.status = 'Synced';
                    visitRecord.erpName = visitPush.erpName;
                }
            } catch(e) {}

            const existingVisits = await AsyncStorage.getItem('offlineVisits');
            const visitsArray = existingVisits ? JSON.parse(existingVisits) : [];
            visitsArray.push(visitRecord);
            await AsyncStorage.setItem('offlineVisits', JSON.stringify(visitsArray));
            
            await AsyncStorage.removeItem('activeLat');
            await AsyncStorage.removeItem('activeLng');
        }

        setOverlayMessage('Done!');
        setTimeout(() => {
            checkoutLock.current = false;
            setIsCheckingOut(false);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }, 1500);
    };

    const totalValue = Object.values(cart).reduce((s, i) => s + ((Number(i.price)||0) * i.qty), 0);

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : null}>
            {isCheckingOut && (
                <View style={styles.fullScreenOverlay}>
                    <MaterialCommunityIcons name={overlayMessage === 'Done!' ? "check-circle-outline" : "cloud-sync"} size={80} color="white" />
                    <Text style={styles.overlayText}>{overlayMessage}</Text>
                    {overlayMessage !== 'Done!' && <ActivityIndicator size="large" color="white" style={{marginTop: 20}} />}
                </View>
            )}
            
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
                keyExtractor={item => item.id} numColumns={2}
                columnWrapperStyle={{ paddingHorizontal: 5 }}
                contentContainerStyle={{ paddingBottom: 110, paddingTop: 10 }}
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
                                    <TextInput 
                                        style={styles.qtyInput} 
                                        keyboardType="numeric" 
                                        value={qty > 0 ? qty.toString() : ''} 
                                        placeholder="0"
                                        onChangeText={(text) => {
                                            let parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                            let newCart = { ...cart };
                                            if (isNaN(parsed) || parsed <= 0) { delete newCart[item.id]; } 
                                            else { newCart[item.id] = { ...item, qty: parsed }; }
                                            setCart(newCart);
                                        }}
                                        selectTextOnFocus
                                    />
                                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
            />

            {totalValue > 0 && (
                <View style={[styles.floatingCartContainer, { bottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
                    <View style={styles.cartSummary}>
                        <Text style={styles.cartLabel}>{Object.keys(cart).length} Items</Text>
                        <Text style={styles.cartValue}>Tsh {totalValue.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={isCheckingOut}>
                        <Text style={styles.checkoutText}>Complete Order</Text>
                        <MaterialCommunityIcons name="arrow-right-circle" size={22} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(211, 47, 47, 0.95)', zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center' },
    overlayText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 15 },
    header: { backgroundColor: '#D32F2F', padding: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
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
    stepBtn: { padding: 5, width: 30, alignItems: 'center' },
    stepText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    qtyInput: { fontSize: 15, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', minWidth: 30, paddingVertical: 0 },
    floatingCartContainer: { position: 'absolute', left: 15, right: 15, backgroundColor: '#212121', borderRadius: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, paddingLeft: 20, elevation: 10 },
    cartSummary: { flexDirection: 'column' },
    cartLabel: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
    cartValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 15, marginRight: 5 }
});
