/**
 * League Management Screen
 *
 * Manage leagues and memberships
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
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import api from '../../services/api';

interface League {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  draftStatus: string;
  maxPlayers: number;
  currentPlayers: number;
  createdAt?: string;
  stats?: {
    members: number;
    picks: number;
    scores: number;
    draftPicks: number;
    rankings: number;
  };
}

export default function LeagueManagementScreen() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Create league form state
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [newLeagueMaxPlayers, setNewLeagueMaxPlayers] = useState('10');
  const [newLeaguePasswordProtected, setNewLeaguePasswordProtected] = useState(false);
  const [newLeaguePassword, setNewLeaguePassword] = useState('');

  // Edit league form state
  const [editLeagueName, setEditLeagueName] = useState('');
  const [editLeagueStatus, setEditLeagueStatus] = useState('');
  const [editLeagueMaxPlayers, setEditLeagueMaxPlayers] = useState('');

  const fetchLeagues = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/leagues');
      // Server returns { leagues: [...] } format
      setLeagues(response.data?.leagues || response.data || []);
    } catch (err) {
      console.error('Failed to fetch leagues:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to load leagues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeagues();
  };

  const resetCreateForm = () => {
    setNewLeagueName('');
    setNewLeagueDescription('');
    setNewLeagueMaxPlayers('10');
    setNewLeaguePasswordProtected(false);
    setNewLeaguePassword('');
  };

  const handleCreateLeague = async () => {
    // Validate
    if (!newLeagueName.trim() || newLeagueName.length < 3) {
      Alert.alert('Error', 'League name must be at least 3 characters');
      return;
    }

    const maxPlayers = parseInt(newLeagueMaxPlayers, 10);
    if (isNaN(maxPlayers) || maxPlayers < 8 || maxPlayers > 12) {
      Alert.alert('Error', 'Max players must be between 8 and 12');
      return;
    }

    if (newLeaguePasswordProtected && newLeaguePassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      await api.post('/api/leagues/create', {
        name: newLeagueName.trim(),
        description: newLeagueDescription.trim() || undefined,
        maxPlayers,
        isPasswordProtected: newLeaguePasswordProtected,
        password: newLeaguePasswordProtected ? newLeaguePassword : undefined,
      });

      Alert.alert('Success', 'League created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchLeagues();
    } catch (err) {
      console.error('Failed to create league:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to create league');
    } finally {
      setCreating(false);
    }
  };

  const handleEditLeague = (league: League) => {
    setEditingLeague(league);
    setEditLeagueName(league.name);
    setEditLeagueStatus(league.status);
    setEditLeagueMaxPlayers(String(league.maxPlayers));
    setShowEditModal(true);
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;

    if (!editLeagueName.trim() || editLeagueName.length < 3) {
      Alert.alert('Error', 'League name must be at least 3 characters');
      return;
    }

    const maxPlayers = parseInt(editLeagueMaxPlayers, 10);
    if (isNaN(maxPlayers) || maxPlayers < 8 || maxPlayers > 12) {
      Alert.alert('Error', 'Max players must be between 8 and 12');
      return;
    }

    try {
      setUpdating(true);
      await api.put(`/api/admin/leagues/${editingLeague.id}`, {
        name: editLeagueName.trim(),
        status: editLeagueStatus,
        maxPlayers,
      });

      Alert.alert('Success', 'League updated successfully!');
      setShowEditModal(false);
      setEditingLeague(null);
      fetchLeagues();
    } catch (err) {
      console.error('Failed to update league:', err);
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', error.response?.data?.error || 'Failed to update league');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLeague = (league: League) => {
    Alert.alert(
      `Delete ${league.name}?`,
      `This will permanently delete this league and all associated data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/leagues/${league.id}`);
              Alert.alert('Success', `${league.name} has been deleted`);
              fetchLeagues();
            } catch (err) {
              console.error('Failed to delete league:', err);
              const error = err as { response?: { data?: { error?: string } } };
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete league');
            }
          },
        },
      ]
    );
  };

  const handleLeagueActions = (league: League) => {
    Alert.alert(
      league.name,
      `Code: ${league.code}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share Code',
          onPress: () => Alert.alert('League Code', `Share this code to invite players:\n\n${league.code}`),
        },
        {
          text: 'Edit League',
          onPress: () => handleEditLeague(league),
        },
        {
          text: 'Delete League',
          style: 'destructive',
          onPress: () => handleDeleteLeague(league),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'OPEN':
        return '#22c55e';
      case 'PENDING':
        return '#f59e0b';
      case 'COMPLETED':
      case 'CLOSED':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getDraftStatusColor = (status: string | undefined) => {
    if (!status) return '#6b7280';
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return '#22c55e';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'PENDING':
      case 'NOT_STARTED':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const renderLeague = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={styles.leagueCard}
      onPress={() => handleLeagueActions(item)}
      activeOpacity={0.7}
    >
      <View style={styles.leagueHeader}>
        <Text style={styles.leagueName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.leagueDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Code:</Text>
          <Text style={styles.detailValue}>{item.code}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{item.type}</Text>
        </View>
        {item.draftStatus && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Draft:</Text>
            <View
              style={[
                styles.draftBadge,
                { backgroundColor: getDraftStatusColor(item.draftStatus) + '20' },
              ]}
            >
              <Text
                style={[styles.draftText, { color: getDraftStatusColor(item.draftStatus) }]}
              >
                {item.draftStatus}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.leagueFooter}>
        <View style={styles.playerCount}>
          <Text style={styles.playerCountValue}>
            {item.currentPlayers}/{item.maxPlayers}
          </Text>
          <Text style={styles.playerCountLabel}>Players</Text>
        </View>

        <View style={styles.actionsHint}>
          <Text style={styles.actionsHintText}>Tap for options</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A42828" />
        <Text style={styles.loadingText}>Loading leagues...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{leagues.length}</Text>
          <Text style={styles.statLabel}>Total Leagues</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.activeStatValue]}>
            {leagues.filter((l) => l.status === 'ACTIVE' || l.status === 'OPEN').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Create League Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>+ Create New League</Text>
      </TouchableOpacity>

      {/* League List */}
      <FlatList
        data={leagues}
        renderItem={renderLeague}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No leagues found</Text>
            <Text style={styles.emptySubtext}>Create your first league above!</Text>
          </View>
        }
      />

      {/* Create League Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Create New League</Text>

              <Text style={styles.inputLabel}>League Name *</Text>
              <TextInput
                style={styles.input}
                value={newLeagueName}
                onChangeText={setNewLeagueName}
                placeholder="Enter league name"
                placeholderTextColor="#999"
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newLeagueDescription}
                onChangeText={setNewLeagueDescription}
                placeholder="Enter description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <Text style={styles.inputLabel}>Max Players (8-12)</Text>
              <TextInput
                style={styles.input}
                value={newLeagueMaxPlayers}
                onChangeText={setNewLeagueMaxPlayers}
                placeholder="10"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Password Protected</Text>
                <Switch
                  value={newLeaguePasswordProtected}
                  onValueChange={setNewLeaguePasswordProtected}
                  trackColor={{ false: '#e5e5e5', true: '#A42828' }}
                  thumbColor={newLeaguePasswordProtected ? '#fff' : '#f4f3f4'}
                />
              </View>

              {newLeaguePasswordProtected && (
                <>
                  <Text style={styles.inputLabel}>League Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newLeaguePassword}
                    onChangeText={setNewLeaguePassword}
                    placeholder="Enter password (min 6 chars)"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                  onPress={handleCreateLeague}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create League</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit League Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit League</Text>

              <Text style={styles.inputLabel}>League Name</Text>
              <TextInput
                style={styles.input}
                value={editLeagueName}
                onChangeText={setEditLeagueName}
                placeholder="Enter league name"
                placeholderTextColor="#999"
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusPicker}>
                {['OPEN', 'ACTIVE', 'CLOSED'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      editLeagueStatus === status && styles.statusOptionActive,
                    ]}
                    onPress={() => setEditLeagueStatus(status)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        editLeagueStatus === status && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Max Players (8-12)</Text>
              <TextInput
                style={styles.input}
                value={editLeagueMaxPlayers}
                onChangeText={setEditLeagueMaxPlayers}
                placeholder="10"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingLeague(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, updating && styles.submitButtonDisabled]}
                  onPress={handleUpdateLeague}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  activeStatValue: {
    color: '#22c55e',
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
  createButton: {
    backgroundColor: '#A42828',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  leagueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leagueDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  draftText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leagueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  playerCountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A42828',
  },
  playerCountLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '600',
  },
  statusPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#A42828',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#A42828',
    fontWeight: '600',
  },
});
