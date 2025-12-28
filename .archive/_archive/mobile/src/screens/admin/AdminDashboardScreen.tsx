/**
 * Admin Dashboard Screen
 *
 * Main admin menu with links to all admin features
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type AdminNavProp = NativeStackNavigationProp<AdminStackParamList>;

interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  screen: keyof AdminStackParamList;
}

const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: 'scoring',
    title: 'Weekly Scoring',
    description: 'Enter and publish weekly scores',
    icon: '📊',
    screen: 'WeeklyScoring',
  },
  {
    id: 'castaways',
    title: 'Castaway Manager',
    description: 'Manage castaways and eliminations',
    icon: '🏝️',
    screen: 'CastawayManager',
  },
  {
    id: 'users',
    title: 'User Management',
    description: 'View and manage users',
    icon: '👥',
    screen: 'UserManagement',
  },
  {
    id: 'leagues',
    title: 'League Management',
    description: 'Manage leagues and memberships',
    icon: '🏆',
    screen: 'LeagueManagement',
  },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<AdminNavProp>();

  const handleMenuPress = (screen: keyof AdminStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage your fantasy league</Text>
      </View>

      <View style={styles.menuGrid}>
        {ADMIN_MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard}
            onPress={() => handleMenuPress(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
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
  header: {
    backgroundColor: '#A42828',
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  menuGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
