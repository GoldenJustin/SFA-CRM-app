import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientProfileScreen({ navigation, route }) {
  const { client } = route.params;
  const insets = useSafeAreaInsets();

  const openMap = () => {
    if (!client.lat || !client.lng) return alert('No GPS coordinates found for this client.');
    const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${client.lat},${client.lng}`;
    const label = client.name;
    const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` });
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {client.image ? (
        <Image source={{ uri: client.image }} style={styles.headerImg} />
      ) : (
        <View style={styles.headerPlaceholder}>
          <MaterialCommunityIcons name="storefront" size={80} color="white" />
        </View>
      )}

      <TouchableOpacity style={[styles.backBtn, {top: insets.top + 10}]} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{client.name}</Text>
          <Text style={styles.type}>{client.businessType || 'Customer'}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><MaterialCommunityIcons name="phone" size={20} color="#1976D2" /></View>
            <Text style={styles.infoText}>{client.phone || 'No phone number'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><MaterialCommunityIcons name="map-marker" size={20} color="#D32F2F" /></View>
            <Text style={styles.infoText}>
              {client.lat ? `GPS: ${client.lat.toFixed(4)}, ${client.lng.toFixed(4)}` : 'No GPS Coordinates'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnMap} onPress={openMap}>
            <MaterialCommunityIcons name="directions" size={24} color="white" />
            <Text style={styles.actionText}>Get Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnVisit} onPress={() => navigation.navigate('VisitCheckIn', { clientName: client.name })}>
            <MaterialCommunityIcons name="store-marker" size={24} color="white" />
            <Text style={styles.actionText}>Start Visit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  headerImg: { width: '100%', height: 300, backgroundColor: '#ccc' },
  headerPlaceholder: { width: '100%', height: 300, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', left: 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 20, zIndex: 10 },
  content: { padding: 20, marginTop: -40 },
  card: { backgroundColor: 'white', padding: 25, borderRadius: 20, elevation: 5 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  type: { fontSize: 14, color: 'gray', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoText: { fontSize: 16, color: '#555', fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  actionBtnMap: { flex: 1, flexDirection: 'row', backgroundColor: '#333', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  actionBtnVisit: { flex: 1, flexDirection: 'row', backgroundColor: '#D32F2F', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  actionText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 15 }
});
