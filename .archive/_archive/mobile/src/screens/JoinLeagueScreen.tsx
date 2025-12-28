/**
 * Join League Screen
 *
 * Allows users to join leagues by code or browse public leagues.
 * Follows CEREBRO mobile UI/UX design principles:
 * - Clear visual hierarchy
 * - 8pt grid spacing
 * - Thumb-friendly touch targets (44pt+)
 * - Clear error states
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLeague } from '../context/LeagueContext';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';

interface PublicLeague {
  id: string;
  name: string;
  code: string;
  description?: string;
  currentPlayers: number;
  maxPlayers: number;
  entryFee: number;
  charityEnabled: boolean;
  isMember: boolean;
}

export default function JoinLeagueScreen() {
  const navigation = useNavigation<any>();
  const { joinLeague, fetchLeagues } = useLeague();

  // Form state
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  // Loading/Error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Public leagues
  const [publicLeagues, setPublicLeagues] = useState<PublicLeague[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const handleJoinByCode = async () => {
    if (!code.trim()) {
      setError('Please enter a league code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, preview the league to check for entry fee
      const previewResponse = await api.get(`/api/leagues/${code}/preview`);
      const preview = previewResponse.data?.league;

      if (preview && preview.entryFee > 0) {
        // Paid league - open web browser for Stripe checkout
        Alert.alert(
          'Paid League',
          `This league has a $${Number(preview.entryFee).toFixed(0)} entry fee. You'll be redirected to complete payment.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  const checkoutResponse = await api.post('/api/payments/create-checkout', {
                    leagueId: preview.id,
                    platform: 'mobile',
                  });

                  if (checkoutResponse.data.url) {
                    await Linking.openURL(checkoutResponse.data.url);
                    // After payment, user will need to re-open app
                    Alert.alert(
                      'Payment Started',
                      'Complete your payment in the browser. Return to the app once done and refresh your leagues.',
                      [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                  }
                } catch (err) {
                  setError('Failed to create checkout session');
                }
              },
            },
          ]
        );
        setLoading(false);
        return;
      }

      // Free league - join directly
      const response = await api.post(`/api/leagues/${code}/join`, {
        code,
        password: needsPassword ? password : undefined,
      });

      setSuccess(true);
      await fetchLeagues();

      Alert.alert(
        'Success!',
        `You've joined ${response.data.league?.name || 'the league'}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.error;

      if (errorMsg === 'Password required') {
        setNeedsPassword(true);
        setError('This league is password protected');
      } else if (errorMsg === 'Incorrect password') {
        setError('Incorrect password. Please try again.');
      } else if (errorMsg === 'You are already a member of this league') {
        setError('You are already a member of this league');
      } else if (errorMsg === 'League not found') {
        setError('No league found with that code');
      } else {
        setError(errorMsg || 'Failed to join league');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPublicLeagues = async () => {
    setLoadingPublic(true);
    try {
      const response = await api.get('/api/leagues/public');
      setPublicLeagues(response.data.leagues || []);
    } catch (err) {
      console.error('Failed to load public leagues:', err);
    } finally {
      setLoadingPublic(false);
    }
  };

  const handleSelectPublicLeague = (league: PublicLeague) => {
    if (league.isMember) {
      Alert.alert('Already a Member', 'You are already a member of this league.');
      return;
    }
    setCode(league.code);
    setNeedsPassword(false);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Join a League</Text>
          <Text style={styles.headerSubtitle}>
            Enter a code or browse open leagues
          </Text>
        </View>

        {/* Join by Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join with Code</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>League Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="e.g., SMIT-ABCD1234"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Ask the league commissioner for the code
            </Text>
          </View>

          {needsPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>League Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#999"
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleJoinByCode}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Join League</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Browse Public Leagues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Leagues</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadPublicLeagues}
              disabled={loadingPublic}
            >
              <Text style={styles.refreshButtonText}>
                {loadingPublic ? 'Loading...' : publicLeagues.length > 0 ? 'Refresh' : 'Browse'}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingPublic ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#A42828" />
              <Text style={styles.loadingText}>Loading leagues...</Text>
            </View>
          ) : publicLeagues.length > 0 ? (
            <View style={styles.leagueList}>
              {publicLeagues.map((league) => (
                <TouchableOpacity
                  key={league.id}
                  style={[
                    styles.leagueCard,
                    league.isMember && styles.leagueCardMember,
                    code === league.code && styles.leagueCardSelected,
                  ]}
                  onPress={() => handleSelectPublicLeague(league)}
                  activeOpacity={0.7}
                >
                  <View style={styles.leagueCardHeader}>
                    <Text style={styles.leagueName}>{league.name}</Text>
                    {league.isMember && (
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>Member</Text>
                      </View>
                    )}
                  </View>

                  {league.description && (
                    <Text style={styles.leagueDescription} numberOfLines={2}>
                      {league.description}
                    </Text>
                  )}

                  <View style={styles.leagueFooter}>
                    <Text style={styles.leagueMeta}>
                      {league.currentPlayers}/{league.maxPlayers} players
                    </Text>
                    <View style={styles.leagueBadges}>
                      {league.entryFee > 0 && (
                        <View style={styles.feeBadge}>
                          <Text style={styles.feeBadgeText}>
                            ${Number(league.entryFee).toFixed(0)}
                          </Text>
                        </View>
                      )}
                      {league.charityEnabled && (
                        <View style={styles.charityBadge}>
                          <Text style={styles.charityBadgeText}>Charity</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                Tap "Browse" to see open leagues
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#A42828',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A42828',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  leagueList: {
    gap: 12,
  },
  leagueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leagueCardMember: {
    backgroundColor: '#f9fafb',
    opacity: 0.7,
  },
  leagueCardSelected: {
    borderColor: '#A42828',
    backgroundColor: '#FFF8F8',
  },
  leagueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  memberBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  leagueDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  leagueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  leagueMeta: {
    fontSize: 13,
    color: '#888',
  },
  leagueBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  feeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeBadgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '600',
  },
  charityBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  charityBadgeText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});
