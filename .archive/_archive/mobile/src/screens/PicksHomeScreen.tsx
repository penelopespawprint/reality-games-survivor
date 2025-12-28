/**
 * Picks Home Screen
 *
 * Main hub for picks - shows draft status and weekly picks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';
import { useLeague } from '../context/LeagueContext';
import { useOffline } from '../context/OfflineContext';
import { SectionLoader } from '../components/TorchLoader';
import { PicksStackParamList } from '../navigation/types';

type PicksHomeNavigationProp = NativeStackNavigationProp<PicksStackParamList, 'PicksHome'>;

interface DraftStatus {
  submitted: boolean;
  picks: any[];
  deadline?: string;
}

interface WeekInfo {
  weekNumber: number;
  title: string;
  deadline: string;
  isActive: boolean;
  hasSubmitted: boolean;
}

export default function PicksHomeScreen() {
  const navigation = useNavigation<PicksHomeNavigationProp>();
  const { currentLeague } = useLeague();
  const { isConnected, pendingRequests } = useOffline();

  const [draftStatus, setDraftStatus] = useState<DraftStatus | null>(null);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentLeague) return;

    try {
      setError(null);

      // Fetch draft status
      const draftResponse = await api.get(API_CONFIG.ENDPOINTS.MY_DRAFT);
      setDraftStatus(draftResponse.data);

      // Fetch weeks from real API endpoint
      try {
        const weeksResponse = await api.get(API_CONFIG.ENDPOINTS.WEEKS, {
          headers: currentLeague ? { 'x-league-id': currentLeague.id } : {},
        });
        setWeeks(weeksResponse.data || []);
      } catch (weekErr: any) {
        // If no weeks exist yet (Season 50 COLLECTING mode), show empty state
        console.log('No weeks available yet:', weekErr.response?.status);
        setWeeks([]);
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load picks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLeague]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SectionLoader />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A42828" />
      }
    >
      {/* Offline Banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📴 Offline {pendingRequests > 0 ? `(${pendingRequests} pending)` : ''}
          </Text>
        </View>
      )}

      {/* League Header */}
      {currentLeague && (
        <View style={styles.leagueHeader}>
          <Text style={styles.leagueName}>{currentLeague.name}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Draft Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Draft Picks</Text>

        <TouchableOpacity
          style={[styles.card, draftStatus?.submitted && styles.cardCompleted]}
          onPress={() => navigation.navigate('DraftPicks')}
          accessibilityRole="button"
          accessibilityLabel={draftStatus?.submitted
            ? `Draft submitted with ${draftStatus.picks.length} castaways ranked. Tap to view.`
            : 'Submit your draft. Rank your castaways to earn points.'}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardIcon} accessibilityElementsHidden={true}>
              {draftStatus?.submitted ? '✅' : '✋'}
            </Text>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>
                {draftStatus?.submitted ? 'Draft Submitted' : 'Submit Your Draft'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {draftStatus?.submitted
                  ? `${draftStatus.picks.length} castaways ranked`
                  : 'Rank your castaways to earn points'}
              </Text>
            </View>
            <Text style={styles.cardArrow} accessibilityElementsHidden={true}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Weekly Picks Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Picks</Text>

        {weeks.map((week) => (
          <TouchableOpacity
            key={week.weekNumber}
            style={[
              styles.card,
              week.isActive && styles.cardActive,
              week.hasSubmitted && styles.cardCompleted,
            ]}
            onPress={() => navigation.navigate('WeeklyPicks', { weekNumber: week.weekNumber })}
            disabled={!week.isActive && !week.hasSubmitted}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>
                {week.hasSubmitted ? '✅' : week.isActive ? '⏰' : '🔒'}
              </Text>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{week.title}</Text>
                <Text style={styles.cardSubtitle}>
                  {week.hasSubmitted
                    ? 'Picks submitted'
                    : week.isActive
                    ? `Deadline: ${week.deadline}`
                    : 'Locked'}
                </Text>
              </View>
              {(week.isActive || week.hasSubmitted) && (
                <Text style={styles.cardArrow}>→</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3EED9',
  },
  offlineBanner: {
    backgroundColor: '#6b7280',
    padding: 8,
  },
  offlineText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  leagueHeader: {
    backgroundColor: '#A42828',
    padding: 16,
  },
  leagueName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: '#A42828',
  },
  cardCompleted: {
    opacity: 0.8,
    backgroundColor: '#dcfce7',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardArrow: {
    fontSize: 20,
    color: '#A42828',
    fontWeight: 'bold',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
});
