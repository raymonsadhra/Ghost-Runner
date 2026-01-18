import React from 'react';
import { StatusBar, Text, Platform, StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PILL_HORIZONTAL_MARGIN = 16;
const PILL_WIDTH = SCREEN_WIDTH - PILL_HORIZONTAL_MARGIN * 2;
const TAB_CONFIG = [
  { name: 'HomeTab', label: 'Home', icon: '🏠' },
  { name: 'LeaderboardTab', label: 'Leaderboards', icon: '🏆' },
  { name: 'FriendsTab', label: 'Friends', icon: '👥' },
  { name: 'ProfileTab', label: 'Profile', icon: '👤' },
];

import HomeScreen from './src/screens/HomeScreen';
import RunScreen from './src/screens/RunScreen';
import GhostSelectScreen from './src/screens/GhostSelectScreen';
import GhostRunScreen from './src/screens/GhostRunScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import RunHistoryScreen from './src/screens/RunHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import UserRunHistoryScreen from './src/screens/UserRunHistoryScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import { theme } from './src/theme';
import { audioSources } from './src/config/audioSources';
import { SettingsProvider } from './src/contexts/SettingsContext';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Apple News–style frosted glass tab bar (floating pill, segmented active highlight)
function GlassTabBar(props) {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;
  
  const route = state?.routes[state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(route);
  const hideTabBarRoutes = ['Run', 'GhostRun'];
  const shouldHide = nestedRouteName && hideTabBarRoutes.includes(nestedRouteName);
  
  if (shouldHide) return null;
  
  const bottomInset = Math.max(insets.bottom, 10);
  
  const PillContent = (
    <View style={styles.pillInner}>
      {TAB_CONFIG.map((tab, index) => {
        const isActive = state.routes[state.index]?.name === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tabSegment}
          >
            {isActive && <View style={styles.activeSegment} />}
            <View style={styles.tabContent}>
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, { paddingBottom: bottomInset }]}>
        <View style={styles.pillWrapper}>
          <BlurView intensity={95} tint="dark" style={styles.pillBlur}>
            <View style={styles.pillOverlay} />
            {PillContent}
          </BlurView>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.pillWrapper, styles.pillAndroid]}>
        {PillContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: PILL_HORIZONTAL_MARGIN,
  },
  pillWrapper: {
    width: PILL_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pillBlur: {
    overflow: 'hidden',
    borderRadius: 28,
  },
  pillOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 23, 0.35)',
    borderRadius: 28,
  },
  pillAndroid: {
    backgroundColor: 'rgba(18, 26, 42, 0.92)',
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    paddingHorizontal: 4,
  },
  tabSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 16,
    marginHorizontal: 2,
    position: 'relative',
  },
  activeSegment: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(47, 107, 255, 0.35)',
    borderRadius: 16,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.7,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(232, 240, 255, 0.65)',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: theme.colors.primary,
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
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
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
      <Stack.Screen
        name="UserRunHistory"
        component={UserRunHistoryScreen}
        options={({ route }) => ({
          title: `${route.params?.userName ?? 'Runner'}'s Runs`,
          headerShown: true,
        })}
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
    <SettingsProvider>
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
                  paddingTop: 0,
                  paddingBottom: 0,
                  height: 60,
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
              paddingVertical: 6,
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
    </SettingsProvider>
  );
}
