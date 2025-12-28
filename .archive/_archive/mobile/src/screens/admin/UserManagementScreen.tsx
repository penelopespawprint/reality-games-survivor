/**
 * User Management Screen
 *
 * View and manage users
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
  TextInput,
} from 'react-native';
import api from '../../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/api/users');
      const userData = response.data || [];
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.username && user.username.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, users]);

  const handleToggleAdmin = async (user: User) => {
    const action = user.isAdmin ? 'remove admin rights from' : 'grant admin rights to';

    Alert.alert(
      `${user.isAdmin ? 'Remove' : 'Grant'} Admin`,
      `Are you sure you want to ${action} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: user.isAdmin ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/api/users/${user.id}/admin`, {
                isAdmin: !user.isAdmin,
              });
              Alert.alert(
                'Success',
                `${user.name} is ${user.isAdmin ? 'no longer' : 'now'} an admin`
              );
              fetchUsers();
            } catch (err) {
              console.error('Failed to update user:', err);
              const error = err as { response?: { data?: { error?: string } } };
              Alert.alert('Error', error.response?.data?.error || 'Failed to update user');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (user: User) => {
    Alert.alert(
      `Delete ${user.name}?`,
      `This will permanently delete this user and all their data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${user.id}`);
              Alert.alert('Success', `${user.name} has been deleted`);
              fetchUsers();
            } catch (err) {
              console.error('Failed to delete user:', err);
              const error = err as { response?: { data?: { error?: string } } };
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleUserActions = (user: User) => {
    Alert.alert(
      user.name,
      user.email,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.isAdmin ? 'Remove Admin' : 'Make Admin',
          onPress: () => handleToggleAdmin(user),
        },
        {
          text: 'Delete User',
          style: 'destructive',
          onPress: () => handleDeleteUser(user),
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserActions(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>
          {item.name
            ? item.name
                .split(' ')
                .map((n) => n[0] || '')
                .join('')
                .toUpperCase()
                .slice(0, 2) || '??'
            : '??'}
        </Text>
        {item.isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>A</Text>
          </View>
        )}
      </View>

      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.isAdmin && <Text style={styles.adminTag}>Admin</Text>}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userJoined}>Joined {formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.actionsHint}>
        <Text style={styles.actionsHintText}>Tap for actions</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.adminStatValue]}>{adminCount}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users match your search' : 'No users found'}
            </Text>
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
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  adminStatValue: {
    color: '#f59e0b',
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  userCard: {
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
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#A42828',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  adminTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userJoined: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionsHint: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionsHintText: {
    fontSize: 10,
    color: '#999',
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
