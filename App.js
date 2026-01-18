import React from 'react';
import { StatusBar, Text, Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import RunScreen from './src/screens/RunScreen';
import GhostSelectScreen from './src/screens/GhostSelectScreen';
import GhostRunScreen from './src/screens/GhostRunScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import RunHistoryScreen from './src/screens/RunHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import { theme } from './src/theme';
import { audioSources } from './src/config/audioSources';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Glass Tab Bar Component
function GlassTabBar(props) {
  const insets = useSafeAreaInsets();
  
  // Check if we should hide the tab bar based on current route
  const state = props.state;
  const route = state?.routes[state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(route);
  const hideTabBarRoutes = ['Run', 'GhostRun'];
  const shouldHide = nestedRouteName && hideTabBarRoutes.includes(nestedRouteName);
  
  // If we should hide, return null to remove the entire tab bar including background
  if (shouldHide) {
    return null;
  }
  
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.tabBarContainer}>
        <BlurView
          intensity={80}
          tint="dark"
          style={[
            styles.blurView,
            {
              paddingBottom: Math.max(insets.bottom, 8),
              height: 60 + Math.max(insets.bottom, 8),
            },
          ]}
        >
          <View style={styles.blurOverlay} />
          <BottomTabBar {...props} style={styles.tabBar} />
        </BlurView>
      </View>
    );
  }
  
  // Android fallback with semi-transparent background
  return (
    <View style={[styles.tabBarContainer, styles.androidTabBar]}>
      <BottomTabBar {...props} style={styles.tabBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  blurView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 23, 0.4)',
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 8,
  },
  androidTabBar: {
    backgroundColor: 'rgba(11, 15, 23, 0.95)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});

// Home Stack Navigator (for run flow)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.ink },
        headerTintColor: theme.colors.mist,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Run"
        component={RunScreen}
        options={{ title: 'New Run' }}
      />
      <Stack.Screen
        name="GhostSelect"
        component={GhostSelectScreen}
        options={{ title: 'Choose a Ghost' }}
      />
      <Stack.Screen
        name="GhostRun"
        component={GhostRunScreen}
        initialParams={{ audioSources }}
        options={{ title: 'Race the Ghost' }}
      />
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: 'Run Summary' }}
      />
      <Stack.Screen
        name="RunHistory"
        component={RunHistoryScreen}
        options={{ title: 'Run History' }}
      />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.ink },
        headerTintColor: theme.colors.mist,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Leaderboard Stack Navigator
function LeaderboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.ink },
        headerTintColor: theme.colors.mist,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Friends Stack Navigator
function FriendsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.ink },
        headerTintColor: theme.colors.mist,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
          const hideTabBarRoutes = ['Run', 'GhostRun'];
          const shouldHideTabBar = hideTabBarRoutes.includes(routeName);
          
          return {
            headerShown: false,
            lazy: false,
            tabBarStyle: shouldHideTabBar
              ? { display: 'none' }
              : {
                  backgroundColor: 'transparent',
                  borderTopWidth: 0,
                  elevation: 0,
                  shadowOpacity: 0,
                  paddingTop: Platform.OS === 'ios' ? 8 : 8,
                  paddingBottom: Platform.OS === 'ios' ? 0 : 8,
                  height: Platform.OS === 'ios' ? 60 : 60,
                },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'rgba(143, 164, 191, 0.65)',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '600',
              marginTop: 2,
              letterSpacing: 0.2,
            },
            tabBarIconStyle: {
              marginTop: 2,
            },
            tabBarItemStyle: {
              paddingVertical: 4,
            },
          };
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="LeaderboardTab" 
          component={LeaderboardStack}
          options={{
            tabBarLabel: 'Leaderboards',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>🏆</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="FriendsTab" 
          component={FriendsStack}
          options={{
            tabBarLabel: 'Friends',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>👥</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileStack}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
