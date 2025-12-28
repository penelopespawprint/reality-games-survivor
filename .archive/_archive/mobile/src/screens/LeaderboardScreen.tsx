/**
 * Leaderboard Screen
 *
 * Displays league leaderboard with current league context
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import { SectionLoader } from '../components/TorchLoader';
import api from '../services/api';
import { API_CONFIG } from '../config/api.config';

interface LeaderboardEntry {
  id: string;
  name: string;
  totalPoints: number;
  rank?: number;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { currentLeague } = useLeague();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!currentLeague) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Use standings endpoint (returns array sorted by totalPoints)
      const response = await api.get(API_CONFIG.ENDPOINTS.LEAGUE_STANDINGS);
      const data = response.data;

      if (Array.isArray(data)) {
        // Add rank to each entry
        const rankedData = data.map((entry: LeaderboardEntry, index: number) => ({
          ...entry,
          rank: index + 1,
        }));
        setLeaderboard(rankedData);
      } else {
        setLeaderboard([]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load leaderboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLeague]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.id === user?.id;
    const accessibilityLabel = isCurrentUser
      ? `You are ranked number ${item.rank} with ${item.totalPoints} points`
      : `${item.name} is ranked number ${item.rank} with ${item.totalPoints} points`;

    return (
      <View
        style={[styles.item, isCurrentUser && styles.currentUserItem]}
        accessible={true}
        accessibilityRole="listitem"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, isCurrentUser && styles.currentUserText]}>
            #{item.rank}
          </Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, isCurrentUser && styles.currentUserText]}>
            {item.name}
            {isCurrentUser && ' (You)'}
          </Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={[styles.points, isCurrentUser && styles.currentUserText]}>
            {item.totalPoints} pts
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer} accessibilityRole="progressbar" accessibilityLabel="Loading leaderboard">
        <SectionLoader />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer} accessibilityRole="alert">
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchLeaderboard}
          accessibilityRole="button"
          accessibilityLabel="Retry loading leaderboard"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No league selected state
  if (!currentLeague) {
    return (
      <View style={styles.centerContainer} accessible={true} accessibilityLabel="No league selected. Go to your profile to select or join a league.">
        <Text style={styles.noLeagueTitle}>No League Selected</Text>
        <Text style={styles.noLeagueText}>
          Go to your Profile to select or join a league
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* League Header */}
      <View style={styles.leagueHeader} accessible={true} accessibilityRole="header">
        <Text style={styles.leagueName}>{currentLeague.name}</Text>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.id}
        accessibilityRole="list"
        accessibilityLabel={`Leaderboard with ${leaderboard.length} players`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#A42828']}
            tintColor="#A42828"
            accessibilityLabel="Pull to refresh leaderboard"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer} accessible={true} accessibilityLabel="No leaderboard data yet. Points will appear after scoring begins.">
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
            <Text style={styles.emptySubtext}>
              Points will appear after scoring begins
            </Text>
          </View>
        }
        contentContainerStyle={leaderboard.length === 0 ? styles.emptyList : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3EED9',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
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
  noLeagueTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  noLeagueText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserItem: {
    backgroundColor: '#fff4f4',
    borderColor: '#A42828',
    borderWidth: 2,
  },
  rankContainer: {
    width: 50,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A42828',
  },
  currentUserText: {
    color: '#A42828',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#A42828',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
