/**
 * Login Screen
 *
 * Home screen with RGFL branding and Auth0 authentication
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onSignUp?: () => void;
}

export default function LoginScreen({ onSignUp }: LoginScreenProps) {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
      // Navigation will happen automatically via auth state change
    } catch (err) {
      const error = err as { message?: string };
      Alert.alert('Login Failed', error.message || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/rgfl-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Survivor Fantasy</Text>
        <Text style={styles.subtitle}>Draft. Pick. Win.</Text>
      </View>

      {/* Login Section */}
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Sign in or create an account"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>A</Text>
              </View>
              <Text style={styles.buttonText}>Sign In / Sign Up</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Secure authentication powered by Auth0
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Season 50 coming February 2026
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9', // RGFL cream background
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#A42828', // RGFL brand red
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#A42828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  buttonIconText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 16,
    fontSize: 13,
    color: '#888',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
});
