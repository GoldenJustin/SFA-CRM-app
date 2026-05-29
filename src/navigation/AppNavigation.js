import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import Screens (we will create these next)
import DashboardScreen from '../screens/DashboardScreen';
import ClientListScreen from '../screens/ClientListScreen';
import PipelineScreen from '../screens/PipelineScreen';
import SyncScreen from '../screens/SyncScreen';
import VisitCheckInScreen from '../screens/VisitCheckInScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// The Bottom Tabs Menu
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'view-dashboard';
          else if (route.name === 'Clients') iconName = 'account-group';
          else if (route.name === 'Pipeline') iconName = 'chart-timeline-variant';
          else if (route.name === 'Sync') iconName = 'cloud-sync';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D32F2F', // Cherry Red
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Clients" component={ClientListScreen} />
      <Tab.Screen name="Pipeline" component={PipelineScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
    </Tab.Navigator>
  );
}

// The Main Stack (Wraps Tabs and adds full screens like Visit Check-In)
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab Menu is the main screen */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* These screens sit on top of the tabs when opened */}
      <Stack.Screen
        name="VisitCheckIn"
        component={VisitCheckInScreen}
        options={{ headerShown: true, title: 'Client Visit' }}
      />
    </Stack.Navigator>
  );
}