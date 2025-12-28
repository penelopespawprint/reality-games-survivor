/**
 * Profile Screen
 *
 * User profile, settings, and logout
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import api from '../services/api';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { leagues, currentLeague } = useLeague();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState<{ totalPoints: number; rank: number | null }>({ totalPoints: 0, rank: null });

  // Fetch user stats when league changes
  const fetchStats = useCallback(async () => {
    if (!currentLeague || !user) return;

    try {
      // Use the leaderboard/me endpoint to get current user's stats
      const response = await api.get('/api/league/leaderboard/me');
      const { position, totalPoints, totalPlayers } = response.data;

      setStats({
        totalPoints: totalPoints || 0,
        rank: position || null,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Fallback: try standings endpoint
      try {
        const standingsResponse = await api.get('/api/league/standings');
        const standings = standingsResponse.data || [];

        // Find current user in standings
        const userIndex = standings.findIndex((entry: { id: string }) => entry.id === user.id);
        if (userIndex !== -1) {
          setStats({
            totalPoints: standings[userIndex].totalPoints || 0,
            rank: userIndex + 1,
          });
        } else {
          setStats({ totalPoints: 0, rank: null });
        }
      } catch (fallbackErr) {
        console.error('Fallback stats fetch also failed:', fallbackErr);
        setStats({ totalPoints: 0, rank: null });
      }
    }
  }, [currentLeague, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      {/* League Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current League</Text>

        <TouchableOpacity
          style={styles.leagueCard}
          onPress={() => navigation.navigate('MyLeagues')}
        >
          <View style={styles.leagueInfo}>
            <Text style={styles.leagueName}>
              {currentLeague?.name || 'No league selected'}
            </Text>
            {currentLeague && (
              <Text style={styles.leagueCode}>Code: {currentLeague.code}</Text>
            )}
            <Text style={styles.leagueTapHint}>Tap to manage leagues</Text>
          </View>
          <Text style={styles.leagueArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{leagues.length}</Text>
            <Text style={styles.statLabel}>Leagues</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rank ? `#${stats.rank}` : '-'}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Get reminders before pick deadlines
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#e5e5e5', true: '#A42828' }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('JoinLeague')}
        >
          <Text style={styles.actionButtonText}>Join New League</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>RGFL Mobile v1.0.0 (POC)</Text>
        <Text style={styles.appCopyright}>Reality Games Fantasy League</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EED9',
  },
  header: {
    backgroundColor: '#A42828',
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A42828',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  leagueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  leagueCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  leagueTapHint: {
    fontSize: 12,
    color: '#A42828',
    marginTop: 4,
  },
  leagueArrow: {
    fontSize: 24,
    color: '#A42828',
    fontWeight: '300',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A42828',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  settingRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#A42828',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  logoutButtonText: {
    color: '#dc2626',
  },
  appInfo: {
    padding: 24,
    alignItems: 'center',
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
