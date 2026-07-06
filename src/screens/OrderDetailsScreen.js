import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ModernAlert from '../components/ModernAlert';

export default function OrderDetailsScreen({ route }) {
    const { order } = route.params;
    const [downloading, setDownloading] = useState(false);
    const [activeFormat, setActiveFormat] = useState('Standard');
    const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'success' });

    useEffect(() => {
        const loadPrintFormat = async () => {
            const stored = await AsyncStorage.getItem('sfaSettings');
            if (stored) {
                const settings = JSON.parse(stored);
                if (settings.default_print_format) setActiveFormat(settings.default_print_format);
            }
        };
        loadPrintFormat();
    }, []);

    const triggerToast = (title, message, type = 'success') => {
        setToast({ visible: true, title, message, type });
    };

    const downloadPDF = async () => {
        if (order.status !== 'Synced' || !order.erpName) {
            return triggerToast("Offline Order", "Sync this order to the server first to generate the official document.", "error");
        }
        
        setDownloading(true);
        triggerToast("Connecting", "Requesting official print layout from ERPNext...", "info");

        try {
            const url = await AsyncStorage.getItem('erp_url');
            const sid = await AsyncStorage.getItem('erp_sid');
            const baseUrl = url ? url.replace(/\/$/, "") : 'http://server.royal.co.tz:8092';
            const doctype = order.type === 'Quotation' ? 'Quotation' : 'Sales Order';

            const pdfUrl = `${baseUrl}/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(order.erpName)}&format=${encodeURIComponent(activeFormat)}&no_letterhead=0`;
            const fileUri = `${FileSystem.documentDirectory}${order.erpName}.pdf`;

            const result = await FileSystem.downloadAsync(pdfUrl, fileUri, {
                headers: { 'Cookie': `sid=${sid}` }
            });

            setDownloading(false);
            if (result && result.status === 200) {
                triggerToast("Success", "PDF downloaded successfully. Ready to share.", "success");
                await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } else {
                throw new Error(`Server returned status: ${result.status}`);
            }
        } catch (e) {
            setDownloading(false);
            triggerToast("Download Error", e.message || "Could not fetch document. Verify connection.", "error");
        }
    };

    return (
        <View style={styles.container}>
            <ModernAlert visible={toast.visible} title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{order.type}</Text>
                    <Text style={styles.subtitle}>{order.erpName || 'Local Queue ID: ' + order.id}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: order.status === 'Synced' ? '#e8f5e9' : '#ffebee' }]}>
                    <Text style={{ color: order.status === 'Synced' ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>{order.status}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Client Name</Text>
                <Text style={styles.value}>{order.clientName}</Text>
                <Text style={[styles.label, { marginTop: 15 }]}>Total Transaction Value</Text>
                <Text style={styles.amount}>Tsh {(Number(order.total) || 0).toLocaleString()}</Text>
            </View>

            <Text style={styles.itemsHeader}>Order Items</Text>
            <FlatList
                data={order.items}
                keyExtractor={(i, index) => i.item_code || index.toString()}
                renderItem={({ item }) => {
                    const itemName = item.item_name || item.name;
                    const itemRate = Number(item.rate || item.price) || 0;
                    const itemQty = Number(item.qty) || 0;
                    return (
                        <View style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{itemName}</Text>
                                <Text style={styles.itemMeta}>{itemQty} x Tsh {itemRate.toLocaleString()}</Text>
                            </View>
                            <Text style={styles.itemTotal}>Tsh {(itemQty * itemRate).toLocaleString()}</Text>
                        </View>
                    );
                }}
            />

            <TouchableOpacity style={styles.downloadBtn} onPress={downloadPDF} disabled={downloading}>
                {downloading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <MaterialCommunityIcons name="file-pdf-box" size={24} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.btnText}>Share ERPNext PDF Print</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 13, color: 'gray', marginTop: 2 },
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
