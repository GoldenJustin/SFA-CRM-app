// Save this content over: App.js
import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AppNavigator from './src/navigation/AppNavigator';
import { authFetch, setSessionExpiredHandler } from './src/api';

// Global navigation ref so the API layer can force a redirect to Login
// whenever ERPNext reports that the session (sid) has expired.
export const navigationRef = createNavigationContainerRef();

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
    // When any API call detects an expired/invalid ERPNext session, clear the
    // stack and send the user to Login instead of failing silently forever.
    setSessionExpiredHandler(() => {
      Alert.alert('Session Expired', 'Your ERPNext session has expired. Please log in again.');
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
      }
    });

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
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" backgroundColor="#D32F2F" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}