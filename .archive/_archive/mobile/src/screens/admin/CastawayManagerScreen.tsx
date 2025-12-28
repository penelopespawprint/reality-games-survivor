/**
 * Castaway Manager Screen
 *
 * Manage castaways and eliminations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import api from '../../services/api';
import { API_CONFIG } from '../../config/api.config';

interface Castaway {
  id: string;
  name: string;
  tribe: string;
  age?: number;
  occupation?: string;
  imageUrl?: string;
  isEliminated: boolean;
  eliminatedWeek?: number;
}

export default function CastawayManagerScreen() {
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  const fetchCastaways = useCallback(async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.CASTAWAYS);
      setCastaways(response.data || []);
    } catch (err) {
      console.error('Failed to fetch castaways:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to load castaways');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCastaways();
  }, [fetchCastaways]);

  const handleToggleElimination = async (castaway: Castaway) => {
    if (castaway.isEliminated) {
      // Reinstate - simple confirmation
      Alert.alert(
        `Reinstate ${castaway.name}?`,
        `This will mark ${castaway.name} as active again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reinstate',
            onPress: async () => {
              try {
                await api.put(`/api/admin/castaway/${castaway.id}`, {
                  eliminated: false,
                  eliminatedWeek: null,
                });
                Alert.alert('Success', `${castaway.name} has been reinstated`);
                fetchCastaways();
              } catch (err) {
                console.error('Failed to update castaway:', err);
                const error = err as { response?: { data?: { error?: string } } };
                Alert.alert('Error', error.response?.data?.error || 'Failed to update castaway');
              }
            },
          },
        ]
      );
    } else {
      // Eliminate - show week picker
      showEliminationPicker(castaway);
    }
  };

  const showEliminationPicker = (castaway: Castaway) => {
    const weeks = Array.from({ length: 14 }, (_, i) => i + 1);
    Alert.alert(
      `Eliminate ${castaway.name}`,
      'Select the week they were eliminated:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...weeks.slice(0, 7).map((week) => ({
          text: `Week ${week}`,
          onPress: () => confirmElimination(castaway, week),
        })),
      ]
    );
  };

  const confirmElimination = async (castaway: Castaway, week: number) => {
    try {
      await api.put(`/api/admin/castaway/${castaway.id}`, {
        eliminated: true,
        eliminatedWeek: week,
      });
      Alert.alert('Success', `${castaway.name} eliminated in Week ${week}`);
      fetchCastaways();
    } catch (err) {
      console.error('Failed to update castaway:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to update castaway');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCastaways();
  };

  const handleImageError = (castawayId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(castawayId));
  };

  const renderCastaway = ({ item }: { item: Castaway }) => (
    <View style={[styles.castawayCard, item.isEliminated && styles.eliminatedCard]}>
      <View style={styles.castawayAvatar}>
        {item.imageUrl && !imageLoadErrors.has(item.id) ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.avatarImage}
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <Text style={styles.avatarText}>{item.name[0] || '?'}</Text>
        )}
        {item.isEliminated && (
          <View style={styles.eliminatedBadge}>
            <Text style={styles.eliminatedBadgeText}>OUT</Text>
          </View>
        )}
      </View>

      <View style={styles.castawayInfo}>
        <Text style={[styles.castawayName, item.isEliminated && styles.eliminatedText]}>
          {item.name}
        </Text>
        <Text style={styles.castawayTribe}>{item.tribe}</Text>
        {item.occupation && (
          <Text style={styles.castawayOccupation}>{item.occupation}</Text>
        )}
        {item.isEliminated && item.eliminatedWeek && (
          <Text style={styles.eliminatedWeek}>Eliminated Week {item.eliminatedWeek}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          item.isEliminated ? styles.reinstateButton : styles.eliminateButton,
        ]}
        onPress={() => handleToggleElimination(item)}
      >
        <Text style={styles.actionButtonText}>
          {item.isEliminated ? 'Reinstate' : 'Eliminate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
        <Text style={styles.loadingText}>Loading castaways...</Text>
      </View>
    );
  }

  const castawayList = Array.isArray(castaways) ? castaways : [];
  const activeCastaways = castawayList.filter((c) => !c.isEliminated);
  const eliminatedCastaways = castawayList.filter((c) => c.isEliminated);

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeCastaways.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.eliminatedStatValue]}>
            {eliminatedCastaways.length}
          </Text>
          <Text style={styles.statLabel}>Eliminated</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{castaways.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Castaway List */}
      <FlatList
        data={[...activeCastaways, ...eliminatedCastaways]}
        renderItem={renderCastaway}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No castaways found</Text>
          </View>
        }
      />
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
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  eliminatedStatValue: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e5e5',
  },
  list: {
    padding: 16,
  },
  castawayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  eliminatedCard: {
    backgroundColor: '#f5f5f5',
  },
  castawayAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#A42828',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  eliminatedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eliminatedBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  castawayInfo: {
    flex: 1,
  },
  castawayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  castawayTribe: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  castawayOccupation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  eliminatedWeek: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 2,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eliminateButton: {
    backgroundColor: '#fee2e2',
  },
  reinstateButton: {
    backgroundColor: '#dcfce7',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
