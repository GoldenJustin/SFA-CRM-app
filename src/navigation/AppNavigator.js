import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import StartDayScreen from '../screens/StartDayScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ClientListScreen from '../screens/ClientListScreen';
import ClientProfileScreen from '../screens/ClientProfileScreen';
import PipelineScreen from '../screens/PipelineScreen';
import SyncScreen from '../screens/SyncScreen';
import HistoryScreen from '../screens/HistoryScreen';
import VisitCheckInScreen from '../screens/VisitCheckInScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import NewLeadScreen from '../screens/NewLeadScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

const DummyScreen = () => null;
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = { headerStyle: { backgroundColor: '#D32F2F' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } };

// Home Tab Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={DashboardScreen} options={{ headerShown: false }} />
 <Stack.Screen name="HistoryScreen" component={HistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen name="VisitCheckIn" component={VisitCheckInScreen} options={{ title: 'Execute Visit' }} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} options={{ title: 'Smart Order' }} />
      <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Data Sync' }} />
    </Stack.Navigator>
  );
}

// Clients Tab Stack (Added VisitCheckIn & Catalog here so bottom bar stays visible)
function ClientsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ClientsMain" component={ClientListScreen} options={{ headerShown: false }} />
 <Stack.Screen name="ClientProfile" component={ClientProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewLead" component={NewLeadScreen} options={{ title: 'Add Client (KYC)' }} />
      <Stack.Screen name="VisitCheckIn" component={VisitCheckInScreen} options={{ title: 'Execute Visit' }} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} options={{ title: 'Smart Order' }} />
    </Stack.Navigator>
  );
}

// Orders Tab Stack
function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="OrdersMain" component={PipelineScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order Details' }} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({ enable_delivery_module: 0, enable_expense_module: 0 });

  useEffect(() => {
    AsyncStorage.getItem('sfaSettings').then(res => {
        if(res) setSettings(JSON.parse(res));
    });
  }, []);

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName = 'circle';
        if (route.name === 'Home') iconName = 'home-analytics';
        else if (route.name === 'Clients') iconName = 'account-group';
        else if (route.name === 'Orders') iconName = 'chart-timeline-variant';
        else if (route.name === 'Deliveries') iconName = 'truck-delivery';
        else if (route.name === 'Expenses') iconName = 'receipt';
        return <MaterialCommunityIcons name={iconName} size={26} color={color} />;
      },
      tabBarActiveTintColor: '#D32F2F',
      tabBarInactiveTintColor: '#888',
      headerShown: false,
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, elevation: 15, height: 60 + insets.bottom, paddingBottom: insets.bottom > 0 ? insets.bottom : 10, paddingTop: 10 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 5 }
    })}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Clients" component={ClientsStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      {settings.enable_delivery_module === 1 && <Tab.Screen name="Deliveries" component={DummyScreen} />}
      {settings.enable_expense_module === 1 && <Tab.Screen name="Expenses" component={DummyScreen} />}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="StartDay" component={StartDayScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
}
