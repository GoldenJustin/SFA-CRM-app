// Save this content over: App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AppNavigator from './src/navigation/AppNavigator';
import { authFetch } from './src/api';

const LOCATION_TASK_NAME = 'background-sfa-location-task';

// Background Task Execution
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[0];
      try {
        await authFetch('/api/method/sfa_crm.api.force_log_location', 'POST', {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          activity: 'Periodic Background Track'
        });
      } catch (e) {}
    }
  }
});

export default function App() {
  useEffect(() => {
    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await Location.requestBackgroundPermissionsAsync();
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 120000, // Trigger every 2 minutes
          distanceInterval: 10,  // Or every 10 meters moved
          foregroundService: {
            notificationTitle: "Cherry SFA Tracker",
            notificationBody: "Tracking your salesman route active.",
            notificationColor: "#D32F2F"
          }
        });
      }
    };
    startTracking();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#D32F2F" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}