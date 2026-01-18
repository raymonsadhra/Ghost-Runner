import React, { useEffect, useState } from 'react';
import { StatusBar, Text, View, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { auth, db } from './src/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

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
// import GlassTabBar from './src/components/GlassTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --------- Login Screen ---------
function LoginScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const createUserDocument = async (userId, userEmail, userName) => {
    try {
      const userRef = doc(db, 'Users', userId);
      const userSnap = await getDoc(userRef);
      const baseName = (userName || 'Runner').trim() || 'Runner';
      const baseNameLower = baseName.toLowerCase();
      const emailLower = userEmail ? userEmail.toLowerCase() : null;
      
      if (!userSnap.exists()) {
        // Create user document in Firestore
        const userData = {
          userId,
          name: baseName,
          displayName: baseName,
          nameLower: baseNameLower,
          displayNameLower: baseNameLower,
          createdAt: serverTimestamp(),
          totalRuns: 0,
          totalDistance: 0,
          lastRunAt: null,
        };
        
        // Only add email if provided (not for anonymous users)
        if (userEmail) {
          userData.email = userEmail;
          userData.emailLower = emailLower;
        }
        
        await setDoc(userRef, userData);
        console.log(`Created user document in Firestore: ${userId}`);
      } else {
        // Update existing user document with name/email if they're missing
        const userData = userSnap.data();
        const updates = {};
        
        if (!userData.name || !userData.displayName) {
          updates.name = baseName || userData.name || 'Runner';
          updates.displayName = baseName || userData.displayName || 'Runner';
        }
        
        if (userEmail && !userData.email) {
          updates.email = userEmail;
        }

        if (!userData.nameLower) {
          updates.nameLower = (userData.name || baseName).toLowerCase();
        }
        if (!userData.displayNameLower) {
          updates.displayNameLower = (userData.displayName || baseName).toLowerCase();
        }
        if (userEmail && !userData.emailLower) {
          updates.emailLower = emailLower;
        }
        
        if (Object.keys(updates).length > 0) {
          await setDoc(userRef, { ...userData, ...updates }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error creating/updating user document:', error);
      // Don't throw - auth succeeded, Firestore doc creation is secondary
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Create user document in Firestore
        await createUserDocument(userCredential.user.uid, email.trim(), name.trim());
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        // Ensure user document exists (in case it was created before we added this feature)
        const userRef = doc(db, 'Users', userCredential.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await createUserDocument(userCredential.user.uid, email.trim(), 'Runner');
        }
      }
    } catch (err) {
      console.error(`${isSignUp ? 'Sign up' : 'Sign in'} error:`, err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('User not found. Switch to "Sign Up" to create an account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Account already exists. Switch to "Sign In" instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || `Failed to ${isSignUp ? 'create account' : 'sign in'}`);
      }
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      // Create user document for anonymous user
      await createUserDocument(userCredential.user.uid, null, 'Guest');
    } catch (err) {
      console.error('Anonymous login error:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('Anonymous auth is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous');
      } else {
        setError(err.message || 'Failed to sign in anonymously. Enable Anonymous Auth in Firebase Console.');
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={loginStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={loginStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={loginStyles.title}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={loginStyles.subtitle}>
          {isSignUp ? 'Sign up to start racing ghosts' : 'Sign in to continue'}
        </Text>

        {error && (
          <View style={loginStyles.errorContainer}>
            <Text style={loginStyles.errorText}>{error}</Text>
          </View>
        )}

        <View style={loginStyles.form}>
          {isSignUp && (
            <View style={loginStyles.inputContainer}>
              <Text style={loginStyles.label}>Name</Text>
              <TextInput
                style={loginStyles.input}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textSoft}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                editable={!loading}
              />
            </View>
          )}

          <View style={loginStyles.inputContainer}>
            <Text style={loginStyles.label}>Email</Text>
            <TextInput
              style={loginStyles.input}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.textSoft}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          <View style={loginStyles.inputContainer}>
            <Text style={loginStyles.label}>Password</Text>
            <TextInput
              style={loginStyles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={isSignUp ? "newPassword" : "password"}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[loginStyles.primaryButton, loading && loginStyles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            <Text style={loginStyles.primaryButtonText}>
              {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={loginStyles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              if (!isSignUp) {
                // Clear name when switching to sign in
                setName('');
              }
            }}
            disabled={loading}
          >
            <Text style={loginStyles.switchText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={loginStyles.divider}>
          <View style={loginStyles.dividerLine} />
          <Text style={loginStyles.dividerText}>OR</Text>
          <View style={loginStyles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[loginStyles.guestButton, loading && loginStyles.buttonDisabled]}
          onPress={handleAnonymousLogin}
          disabled={loading}
        >
          <Text style={loginStyles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.mist,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 87, 87, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.mist,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    marginTop: 16,
    padding: 12,
  },
  switchText: {
    color: theme.colors.primary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surfaceElevated,
  },
  dividerText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  guestButton: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  guestButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

// --------- Stack Navigators ---------
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Run" component={RunScreen} options={{ title: 'New Run' }} />
      <Stack.Screen name="GhostSelect" component={GhostSelectScreen} options={{ title: 'Choose a Ghost' }} />
      <Stack.Screen
        name="GhostRun"
        component={GhostRunScreen}
        initialParams={{ audioSources }}
        options={{ title: 'Race the Ghost' }}
      />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Run Summary' }} />
      <Stack.Screen name="RunHistory" component={RunHistoryScreen} options={{ title: 'Run History' }} />
    </Stack.Navigator>
  );
}

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
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

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
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// --------- Main App ---------
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" />
        {user ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.mist,
              tabBarStyle: {
                backgroundColor: theme.colors.ink,
                borderTopWidth: 0,
              },
            }}
          >
            <Tab.Screen
              name="HomeTab"
              component={HomeStack}
              options={{
                headerShown: false,
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
                headerShown: false,
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
                headerShown: false,
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
                headerShown: false,
                tabBarLabel: 'Profile',
                tabBarIcon: ({ color }) => (
                  <Text style={{ color, fontSize: 20 }}>👤</Text>
                ),
              }}
            />
          </Tab.Navigator>
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
