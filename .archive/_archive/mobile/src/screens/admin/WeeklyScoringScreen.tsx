/**
 * Weekly Scoring Screen
 *
 * Enter and publish weekly scores for castaways
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { API_CONFIG } from '../../config/api.config';

interface Castaway {
  id: string;
  name: string;
  tribe: string;
  isEliminated: boolean;
}

interface WeeklyScore {
  castawayId: string;
  points: number;
}

interface Week {
  weekNumber: number;
  isActive?: boolean;
}

export default function WeeklyScoringScreen() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch weeks
      const weeksResponse = await api.get('/api/admin/weeks');
      setWeeks(weeksResponse.data || []);

      // Fetch castaways
      const castawaysResponse = await api.get(API_CONFIG.ENDPOINTS.CASTAWAYS);
      setCastaways(castawaysResponse.data || []);

      // Fetch existing scores for selected week
      try {
        const scoresResponse = await api.get(`/api/admin/scoring/week/${selectedWeek}`);
        const existingScores: Record<string, string> = {};
        (scoresResponse.data.scores || []).forEach((s: { castawayId: string; points: number }) => {
          existingScores[s.castawayId] = String(s.points);
        });
        setScores(existingScores);
      } catch {
        setScores({});
      }
    } catch (err) {
      console.error('Failed to fetch scoring data:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to load scoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScoreChange = (castawayId: string, value: string) => {
    setScores((prev) => ({ ...prev, [castawayId]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const entries = Object.entries(scores)
        .filter(([_, points]) => points !== '')
        .map(([castawayId, points]) => ({
          castawayId,
          points: parseInt(points, 10) || 0,
        }));

      await api.post(`/api/admin/scoring/week/${selectedWeek}`, {
        entries,
      });

      Alert.alert('Success', 'Scores saved successfully!');
    } catch (err) {
      console.error('Failed to save scores:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    Alert.alert(
      'Publish Scores',
      `This will publish Week ${selectedWeek} scores and notify all players. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            try {
              setPublishing(true);
              await api.post(`/api/admin/scoring/week/${selectedWeek}/publish`);
              Alert.alert('Success', `Week ${selectedWeek} scores published! Players have been notified.`);
              fetchData();
            } catch (err) {
              console.error('Failed to publish scores:', err);
              const error = err as { response?: { data?: { error?: string } } };
              Alert.alert('Error', error.response?.data?.error || 'Failed to publish scores');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  const handleQuickScore = (castawayId: string, points: number) => {
    setScores((prev) => ({
      ...prev,
      [castawayId]: prev[castawayId] ? String(parseInt(prev[castawayId], 10) + points) : String(points),
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
        <Text style={styles.loadingText}>Loading scoring data...</Text>
      </View>
    );
  }

  const castawayList = Array.isArray(castaways) ? castaways : [];
  const activeCastaways = castawayList.filter((c) => !c.isEliminated);
  const eliminatedCastaways = castawayList.filter((c) => c.isEliminated);

  return (
    <View style={styles.container}>
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        <Text style={styles.weekLabel}>Week:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((week) => (
            <TouchableOpacity
              key={week}
              style={[
                styles.weekButton,
                selectedWeek === week && styles.weekButtonActive,
              ]}
              onPress={() => setSelectedWeek(week)}
            >
              <Text
                style={[
                  styles.weekButtonText,
                  selectedWeek === week && styles.weekButtonTextActive,
                ]}
              >
                {week}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scoring Form */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Active Castaways</Text>
        {activeCastaways.map((castaway) => (
          <View key={castaway.id} style={styles.scoreRow}>
            <View style={styles.castawayInfo}>
              <Text style={styles.castawayName}>{castaway.name || 'Unknown'}</Text>
              <Text style={styles.castawayTribe}>{castaway.tribe || 'No Tribe'}</Text>
            </View>
            <View style={styles.quickScoreButtons}>
              <TouchableOpacity
                style={styles.quickScoreBtn}
                onPress={() => handleQuickScore(castaway.id, 1)}
              >
                <Text style={styles.quickScoreText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickScoreBtn}
                onPress={() => handleQuickScore(castaway.id, 5)}
              >
                <Text style={styles.quickScoreText}>+5</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.scoreInput}
              value={scores[castaway.id] || ''}
              onChangeText={(value) => handleScoreChange(castaway.id, value)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#999"
            />
          </View>
        ))}

        {eliminatedCastaways.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.eliminatedTitle]}>
              Eliminated
            </Text>
            {eliminatedCastaways.map((castaway) => (
              <View key={castaway.id} style={[styles.scoreRow, styles.eliminatedRow]}>
                <View style={styles.castawayInfo}>
                  <Text style={[styles.castawayName, styles.eliminatedText]}>
                    {castaway.name || 'Unknown'}
                  </Text>
                  <Text style={styles.castawayTribe}>{castaway.tribe || 'No Tribe'}</Text>
                </View>
                <TextInput
                  style={[styles.scoreInput, styles.eliminatedInput]}
                  value={scores[castaway.id] || ''}
                  onChangeText={(value) => handleScoreChange(castaway.id, value)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || publishing}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Draft</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishButton, publishing && styles.saveButtonDisabled]}
            onPress={handlePublish}
            disabled={saving || publishing}
          >
            {publishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Publish Week {selectedWeek}</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 12,
  },
  weekButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  weekButtonActive: {
    backgroundColor: '#A42828',
  },
  weekButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  weekButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  eliminatedTitle: {
    marginTop: 24,
    color: '#666',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  eliminatedRow: {
    opacity: 0.6,
  },
  castawayInfo: {
    flex: 1,
  },
  quickScoreButtons: {
    flexDirection: 'row',
    marginRight: 8,
    gap: 4,
  },
  quickScoreBtn: {
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  castawayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
  },
  castawayTribe: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scoreInput: {
    width: 60,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eliminatedInput: {
    backgroundColor: '#e5e5e5',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
