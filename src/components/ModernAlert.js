import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ModernAlert({ visible, title, message, type = 'success', onClose }) {
  const getIcon = () => {
    switch (type) {
      case 'error': return 'close-circle';
      case 'info': return 'information-outline';
      default: return 'check-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'error': return '#E53935';
      case 'info': return '#1976D2';
      default: return '#4CAF50';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <MaterialCommunityIcons name={getIcon()} size={50} color={getColor()} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: getColor() }]} onPress={onClose}>
            <Text style={styles.btnText}>DISMISS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btn: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});