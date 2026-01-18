import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './src/screens/HomeScreen';
import RunScreen from './src/screens/RunScreen';
import GhostSelectScreen from './src/screens/GhostSelectScreen';
import GhostRunScreen from './src/screens/GhostRunScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import RunHistoryScreen from './src/screens/RunHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { theme } from './src/theme';
import { audioSources } from './src/config/audioSources';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.ink },
          headerTintColor: theme.colors.mist,
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
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
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
