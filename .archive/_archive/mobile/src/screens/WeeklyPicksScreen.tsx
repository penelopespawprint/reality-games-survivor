/**
 * Weekly Picks Screen
 *
 * Allows users to make picks for a specific week
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';
import { useLeague } from '../context/LeagueContext';
import { useOffline } from '../context/OfflineContext';
import { PicksStackParamList } from '../navigation/types';

type WeeklyPicksRouteProp = RouteProp<PicksStackParamList, 'WeeklyPicks'>;

interface Castaway {
  id: string;
  name: string;
  tribe: string;
  isEliminated: boolean;
}

interface PickCategory {
  id: string;
  name: string;
  description: string;
  points: number;
  allowMultiple: boolean;
}

interface WeeklyPick {
  categoryId: string;
  castawayId: string;
}

// Mock categories - in production these come from the backend
const PICK_CATEGORIES: PickCategory[] = [
  { id: 'immunity', name: 'Immunity Winner', description: 'Who will win individual immunity?', points: 5, allowMultiple: false },
  { id: 'eliminated', name: 'Eliminated', description: 'Who will be voted out?', points: 3, allowMultiple: false },
  { id: 'idol', name: 'Finds Idol', description: 'Who will find a hidden immunity idol?', points: 4, allowMultiple: false },
  { id: 'advantage', name: 'Plays Advantage', description: 'Who will play an advantage?', points: 2, allowMultiple: false },
];

export default function WeeklyPicksScreen() {
  const route = useRoute<WeeklyPicksRouteProp>();
  const { weekNumber } = route.params;
  const { currentLeague } = useLeague();
  const { isConnected, pendingRequests } = useOffline();

  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [existingPicks, setExistingPicks] = useState<WeeklyPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch castaways (only non-eliminated)
      const castawaysResponse = await api.get(API_CONFIG.ENDPOINTS.CASTAWAYS);
      const activeCastaways = castawaysResponse.data.filter((c: Castaway) => !c.isEliminated);
      setCastaways(activeCastaways);

      // Fetch existing picks for this week
      try {
        const picksResponse = await api.get(API_CONFIG.ENDPOINTS.WEEK_PICKS(weekNumber));
        if (picksResponse.data.picks) {
          setExistingPicks(picksResponse.data.picks);
          // Convert to picks map
          const picksMap: Record<string, string> = {};
          picksResponse.data.picks.forEach((p: WeeklyPick) => {
            picksMap[p.categoryId] = p.castawayId;
          });
          setPicks(picksMap);
        }
        if (picksResponse.data.deadline) {
          setDeadline(picksResponse.data.deadline);
        }
      } catch {
        // No existing picks - that's expected for new weeks
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [weekNumber]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Select a castaway for a category
   */
  const selectCastaway = (categoryId: string, castawayId: string) => {
    setPicks(prev => ({
      ...prev,
      [categoryId]: prev[categoryId] === castawayId ? '' : castawayId,
    }));
  };

  /**
   * Submit weekly picks
   */
  const submitPicks = async () => {
    const selectedPicks = Object.entries(picks)
      .filter(([_, castawayId]) => castawayId)
      .map(([categoryId, castawayId]) => ({ categoryId, castawayId }));

    if (selectedPicks.length === 0) {
      Alert.alert('Error', 'Please make at least one pick');
      return;
    }

    Alert.alert(
      'Submit Picks',
      `Submit your picks for Week ${weekNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSaving(true);
              setError(null);

              await api.post(API_CONFIG.ENDPOINTS.SUBMIT_WEEKLY, {
                weekNumber,
                picks: selectedPicks,
              });

              Alert.alert('Success', 'Your picks have been submitted!');
              fetchData(); // Refresh
            } catch (err: any) {
              const errorMessage = err.response?.data?.error || 'Failed to submit picks';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📴 Offline {pendingRequests > 0 ? `(${pendingRequests} pending)` : ''}
          </Text>
        </View>
      )}

      {/* Deadline Banner */}
      {deadline && (
        <View style={styles.deadlineBanner}>
          <Text style={styles.deadlineText}>Deadline: {deadline}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {PICK_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryPoints}>{category.points} pts</Text>
            </View>
            <Text style={styles.categoryDescription}>{category.description}</Text>

            <View style={styles.castawayGrid}>
              {castaways.map((castaway) => (
                <TouchableOpacity
                  key={castaway.id}
                  style={[
                    styles.castawayChip,
                    picks[category.id] === castaway.id && styles.castawayChipSelected,
                  ]}
                  onPress={() => selectCastaway(category.id, castaway.id)}
                >
                  <Text
                    style={[
                      styles.castawayChipText,
                      picks[category.id] === castaway.id && styles.castawayChipTextSelected,
                    ]}
                  >
                    {castaway.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom padding for submit button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={submitPicks}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingPicks.length > 0 ? 'Update Picks' : 'Submit Picks'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  deadlineBanner: {
    backgroundColor: '#f59e0b',
    padding: 12,
  },
  deadlineText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
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
  content: {
    flex: 1,
    padding: 16,
  },
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A42828',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  castawayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castawayChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  castawayChipSelected: {
    backgroundColor: '#A42828',
    borderColor: '#A42828',
  },
  castawayChipText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  castawayChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  submitButton: {
    backgroundColor: '#A42828',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
