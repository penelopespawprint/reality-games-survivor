/**
 * RGFL Mobile App Entry Point
 *
 * React Native + Expo app for Reality Games Fantasy League
 * Features:
 * - Tab navigation (Leaderboard, Picks, Profile)
 * - League selection
 * - Draft and weekly picks
 * - Error tracking (Sentry)
 * - Secure token storage
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { queryClient } from './src/config/queryClient';
import { LeagueProvider } from './src/context/LeagueContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { logApiConfig } from './src/config/api.config';
import { initSentry, setSentryUser } from './src/config/sentry.config';
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  addNotificationReceivedListener
} from './src/services/notifications';
import LoginScreen from './src/screens/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';
import OfflineBanner from './src/components/OfflineBanner';

// Initialize Sentry on app load
initSentry();

// Register for push notifications (runs async)
registerForPushNotifications();

/**
 * Main App Component
 * Handles routing based on authentication state (using Auth0)
 */
function AppContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Log API configuration on startup (dev only)
    logApiConfig();

    // Handle notifications received while app is in foreground
    const foregroundSubscription = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.log('📬 Notification received (foreground):', notification.request.content.title);

      // Show in-app toast or update UI based on notification type
      if (data?.type === 'score_update') {
        console.log('Scores updated - refresh leaderboard');
      } else if (data?.type === 'picks_reminder') {
        console.log('Picks reminder received');
      }
    });

    // Handle notification taps (deep linking)
    const responseSubscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      console.log('📱 Notification tapped:', data);

      // Handle different notification types
      if (data?.type === 'picks_reminder' && data?.weekNumber) {
        // Navigate to weekly picks screen
        console.log(`Navigate to picks for week ${data.weekNumber}`);
      } else if (data?.type === 'score_update') {
        console.log('Navigate to leaderboard');
      } else if (data?.type === 'league_activity' && data?.leagueId) {
        console.log(`Navigate to league ${data.leagueId}`);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
      </View>
    );
  }

  // Show login screen if not authenticated (Auth0 handles both login and signup)
  if (!user) {
    return <LoginScreen />;
  }

  // Show main app with navigation if authenticated
  return (
    <LeagueProvider>
      <NavigationContainer>
        <OfflineBanner />
        <MainNavigator />
      </NavigationContainer>
    </LeagueProvider>
  );
}

/**
 * Root App Component with Providers
 * Wrapped with Sentry for error boundary
 */
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <OfflineProvider>
            <AuthProvider>
              <AppContent />
              <StatusBar style="auto" />
            </AuthProvider>
          </OfflineProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Wrap with Sentry for crash reporting
export default Sentry.wrap(App);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3EED9',
  },
});
