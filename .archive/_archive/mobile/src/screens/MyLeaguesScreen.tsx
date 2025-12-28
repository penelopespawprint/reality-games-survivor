/**
 * My Leagues Screen
 *
 * Displays user's leagues with selection and management options.
 * Follows CEREBRO mobile UI/UX design principles:
 * - Clear visual hierarchy
 * - 8pt grid spacing
 * - Thumb-friendly touch targets (44pt+)
 * - Pull-to-refresh for updates
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLeague, League } from '../context/LeagueContext';

export default function MyLeaguesScreen() {
  const navigation = useNavigation<any>();
  const { leagues, currentLeague, loading, error, fetchLeagues, selectLeague } = useLeague();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeagues();
    setRefreshing(false);
  }, [fetchLeagues]);

  const handleSelectLeague = async (league: League) => {
    await selectLeague(league);
    navigation.goBack();
  };

  const handleJoinLeague = () => {
    navigation.navigate('JoinLeague');
  };

  const renderLeagueItem = ({ item }: { item: League }) => {
    const isSelected = currentLeague?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.leagueCard, isSelected && styles.leagueCardSelected]}
        onPress={() => handleSelectLeague(item)}
        activeOpacity={0.7}
      >
        <View style={styles.leagueInfo}>
          <Text style={styles.leagueName}>{item.name}</Text>
          <Text style={styles.leagueCode}>Code: {item.code}</Text>
          <Text style={styles.leagueMeta}>
            Season {item.seasonNumber} • {item.memberCount || 0} members
          </Text>
        </View>

        <View style={styles.leagueActions}>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>Active</Text>
            </View>
          )}
          {item.isCommissioner && (
            <View style={styles.commissionerBadge}>
              <Text style={styles.commissionerBadgeText}>Commissioner</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏆</Text>
      <Text style={styles.emptyTitle}>No Leagues Yet</Text>
      <Text style={styles.emptyText}>
        Join a league to start competing with friends!
      </Text>
      <TouchableOpacity style={styles.joinButton} onPress={handleJoinLeague}>
        <Text style={styles.joinButtonText}>Join a League</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Leagues</Text>
      <Text style={styles.headerSubtitle}>
        {leagues.length} league{leagues.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={leagues}
        renderItem={renderLeagueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A42828"
            colors={['#A42828']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {leagues.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.joinLeagueButton}
            onPress={handleJoinLeague}
          >
            <Text style={styles.joinLeagueButtonText}>+ Join Another League</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  leagueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leagueCardSelected: {
    borderColor: '#A42828',
    backgroundColor: '#FFF8F8',
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  leagueCode: {
    fontSize: 14,
    color: '#A42828',
    fontWeight: '500',
    marginBottom: 4,
  },
  leagueMeta: {
    fontSize: 13,
    color: '#888',
  },
  leagueActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: '#A42828',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  commissionerBadge: {
    backgroundColor: '#FF776C',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  commissionerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: '#A42828',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    padding: 16,
    paddingBottom: 32,
  },
  joinLeagueButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinLeagueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
