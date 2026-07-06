import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ModernAlert({ visible, title, message, type = 'success', onClose }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 20,
        useNativeDriver: true,
        bounciness: 8
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'error': return { color: '#D32F2F', icon: 'close-circle', bg: '#FFEBEE' };
      case 'info': return { color: '#1976D2', icon: 'information', bg: '#E3F2FD' };
      default: return { color: '#388E3C', icon: 'check-circle', bg: '#E8F5E9' };
    }
  };

  const theme = getTheme();

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.toast, { borderColor: theme.color, backgroundColor: theme.bg }]}>
        <MaterialCommunityIcons name={theme.icon} size={28} color={theme.color} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.color }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={18} color="#777" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 100
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2
  },
  message: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18
  },
  closeBtn: {
    padding: 4
  }
});
