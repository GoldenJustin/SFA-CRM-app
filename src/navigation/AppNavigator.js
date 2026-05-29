import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import StartDayScreen from '../screens/StartDayScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ClientListScreen from '../screens/ClientListScreen';
import PipelineScreen from '../screens/PipelineScreen';
import SyncScreen from '../screens/SyncScreen';
import VisitCheckInScreen from '../screens/VisitCheckInScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import NewLeadScreen from '../screens/NewLeadScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-analytics';
          else if (route.name === 'Clients') iconName = 'account-group';
          else if (route.name === 'Pipeline') iconName = 'chart-timeline-variant';
          else if (route.name === 'Sync') iconName = 'cloud-sync';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D32F2F',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        // Removed hardcoded heights. Safe Area Provider will now handle this dynamically!
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 }
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Clients" component={ClientListScreen} />
      <Tab.Screen name="Pipeline" component={PipelineScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: '#D32F2F' }, 
      headerTintColor: '#fff', 
      headerTitleStyle: { fontWeight: 'bold' }
    }}>
      {/* Login and Start Day don't need headers, we will handle safe area inside them */}
      <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      <Stack.Screen name="StartDay" component={StartDayScreen} options={{headerShown: false}} />
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{headerShown: false}} />
      
      {/* These screens will have standard Red headers automatically padded below the status bar */}
      <Stack.Screen name="VisitCheckIn" component={VisitCheckInScreen} options={{ title: 'Execute Visit' }} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} options={{ title: 'Order & Quotation' }} />
      <Stack.Screen name="NewLead" component={NewLeadScreen} options={{ title: 'Add New Client' }} />
    </Stack.Navigator>
  );
}
