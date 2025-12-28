/**
 * Draft Picks Screen
 *
 * Allows users to rank castaways for their draft picks
 * Uses drag-and-drop for reordering
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
  Image,
} from 'react-native';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';
import { useLeague } from '../context/LeagueContext';
import { useOffline } from '../context/OfflineContext';

interface Castaway {
  id: string;
  name: string;
  tribe: string;
  age?: number;
  occupation?: string;
  imageUrl?: string;
  isEliminated: boolean;
}

interface DraftPick {
  rank: number;
  castawayId: string;
  castaway: Castaway;
}

export default function DraftPicksScreen() {
  const { currentLeague } = useLeague();
  const { isConnected, pendingRequests } = useOffline();

  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [rankedCastaways, setRankedCastaways] = useState<Castaway[]>([]);
  const [existingDraft, setExistingDraft] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch all castaways
      const castawaysResponse = await api.get(API_CONFIG.ENDPOINTS.CASTAWAYS);
      const allCastaways = castawaysResponse.data.filter((c: Castaway) => !c.isEliminated);

      // Fetch existing draft (leagueId automatically injected by API service)
      const draftResponse = await api.get(API_CONFIG.ENDPOINTS.MY_DRAFT);
      const draft = draftResponse.data;

      if (draft.submitted && draft.picks.length > 0) {
        // User has existing draft - use their order
        const orderedCastaways = draft.picks
          .sort((a: DraftPick, b: DraftPick) => a.rank - b.rank)
          .map((p: DraftPick) => p.castaway);
        setRankedCastaways(orderedCastaways);
        setExistingDraft(draft.picks);
      } else {
        // No draft yet - show all castaways in default order
        setRankedCastaways(allCastaways);
      }

      setCastaways(allCastaways);
    } catch (err) {
      console.error('Failed to fetch draft data:', err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load castaways');
    } finally {
      setLoading(false);
    }
  }, [currentLeague]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Move castaway up in rankings
   */
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...rankedCastaways];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setRankedCastaways(newOrder);
    setHasChanges(true);
  };

  /**
   * Move castaway down in rankings
   */
  const moveDown = (index: number) => {
    if (index === rankedCastaways.length - 1) return;
    const newOrder = [...rankedCastaways];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setRankedCastaways(newOrder);
    setHasChanges(true);
  };

  /**
   * Submit draft picks
   */
  const submitDraft = async () => {
    if (rankedCastaways.length === 0) {
      Alert.alert('Error', 'Please rank at least one castaway');
      return;
    }

    Alert.alert(
      'Submit Draft',
      'Are you sure you want to submit your draft picks? You can update them until the deadline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSaving(true);
              setError(null);

              const picks = rankedCastaways.map((castaway, index) => ({
                castawayId: castaway.id,
                rank: index + 1,
              }));

              await api.post(API_CONFIG.ENDPOINTS.SUBMIT_DRAFT, {
                picks,
                leagueId: currentLeague?.id,
              });

              Alert.alert('Success', 'Your draft picks have been submitted!');
              setHasChanges(false);
              fetchData(); // Refresh to get updated data
            } catch (err) {
              const error = err as { response?: { data?: { error?: string } } };
              const errorMessage = error.response?.data?.error || 'Failed to submit draft';
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
        <Text style={styles.loadingText}>Loading castaways...</Text>
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

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Rank castaways from #1 (most likely to win) to #{rankedCastaways.length}.
          Hold and drag to reorder, or use arrows.
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Castaway List */}
      <ScrollView style={styles.list}>
        {rankedCastaways.map((castaway, index) => (
          <View key={castaway.id} style={styles.castawayCard}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>

            <View style={styles.castawayInfo}>
              <Text style={styles.castawayName}>{castaway.name || 'Unknown'}</Text>
              <Text style={styles.castawayTribe}>{castaway.tribe || 'No Tribe'}</Text>
            </View>

            <View style={styles.arrowButtons}>
              <TouchableOpacity
                style={[styles.arrowButton, index === 0 && styles.arrowButtonDisabled]}
                onPress={() => moveUp(index)}
                disabled={index === 0}
              >
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.arrowButton,
                  index === rankedCastaways.length - 1 && styles.arrowButtonDisabled,
                ]}
                onPress={() => moveDown(index)}
                disabled={index === rankedCastaways.length - 1}
              >
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={submitDraft}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingDraft.length > 0 ? 'Update Draft' : 'Submit Draft'}
            </Text>
          )}
        </TouchableOpacity>
        {hasChanges && (
          <Text style={styles.changesText}>You have unsaved changes</Text>
        )}
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
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
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
  instructions: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  instructionsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  list: {
    flex: 1,
    padding: 16,
  },
  castawayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A42828',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  castawayInfo: {
    flex: 1,
  },
  castawayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  castawayTribe: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  arrowButtons: {
    flexDirection: 'column',
    marginLeft: 8,
  },
  arrowButton: {
    width: 36,
    height: 28,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 14,
    color: '#A42828',
    fontWeight: 'bold',
  },
  submitContainer: {
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
  changesText: {
    textAlign: 'center',
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 8,
  },
});
