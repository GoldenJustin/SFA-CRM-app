import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { syncAllDataToERP, pullMasterData } from '../api';
import ModernAlert from '../components/ModernAlert';

export default function SyncScreen() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState('');
    const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'success' });

    const triggerToast = (title, message, type = 'success') => {
        setToast({ visible: true, title, message, type });
    };

    const handlePush = async () => {
        setIsProcessing(true);
        setOverlayMessage('Pushing Local Data...');
        try {
            const result = await syncAllDataToERP(); 
            if (result && result.success) {
                setOverlayMessage('Done!');
            } else {
                setOverlayMessage('');
                triggerToast("Sync Failed", "Could not reach server.", "error");
            }
        } catch(err) {
            setOverlayMessage('');
            triggerToast("Sync Error", err.message, "error");
        } finally {
            setTimeout(() => setIsProcessing(false), 1500);
        }
    };

    const handlePull = async () => {
        setIsProcessing(true);
        setOverlayMessage('Refreshing Master Data...');
        try {
            const result = await pullMasterData();
            if (result && result.success) {
                setOverlayMessage('Done!');
            } else {
                setOverlayMessage('');
                triggerToast("Pull Failed", "Could not synchronize server state.", "error");
            }
        } catch(err) {
            setOverlayMessage('');
            triggerToast("Pull Error", err.message, "error");
        } finally {
            setTimeout(() => setIsProcessing(false), 1500);
        }
    };

    return (
        <View style={styles.container}>
            <ModernAlert visible={toast.visible} title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
            
            {isProcessing && (
                <View style={styles.fullScreenOverlay}>
                    <MaterialCommunityIcons name={overlayMessage === 'Done!' ? "check-circle-outline" : "cloud-sync"} size={80} color="white" />
                    <Text style={styles.overlayText}>{overlayMessage}</Text>
                    {overlayMessage !== 'Done!' && <ActivityIndicator size="large" color="white" style={{marginTop: 20}} />}
                </View>
            )}

            <MaterialCommunityIcons name="cloud-sync" size={80} color="#1976D2" />
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30, marginTop: 10 }}>Data Sync Engine</Text>
            
            <TouchableOpacity style={styles.btnPush} onPress={handlePush} disabled={isProcessing}>
                <Text style={styles.btnText}>PUSH LOCAL DATA TO ERP</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnPull} onPress={handlePull} disabled={isProcessing}>
                <Text style={styles.btnText}>PULL MASTER DATA (Refresh)</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20, alignItems: 'center', justifyContent: 'center' },
    fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(25, 118, 210, 0.95)', zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center' },
    overlayText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 15 },
    btnPush: { backgroundColor: '#D32F2F', padding: 20, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 20, elevation: 3 },
    btnPull: { backgroundColor: '#1976D2', padding: 20, borderRadius: 10, width: '100%', alignItems: 'center', elevation: 3 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
