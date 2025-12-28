/**
 * Main Tab Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';

import LeaderboardScreen from '../screens/LeaderboardScreen';
import PicksHomeScreen from '../screens/PicksHomeScreen';
import DraftPicksScreen from '../screens/DraftPicksScreen';
import WeeklyPicksScreen from '../screens/WeeklyPicksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyLeaguesScreen from '../screens/MyLeaguesScreen';
import JoinLeagueScreen from '../screens/JoinLeagueScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import WeeklyScoringScreen from '../screens/admin/WeeklyScoringScreen';
import CastawayManagerScreen from '../screens/admin/CastawayManagerScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import LeagueManagementScreen from '../screens/admin/LeagueManagementScreen';
import { MainTabParamList, PicksStackParamList, AdminStackParamList, ProfileStackParamList } from './types';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator<MainTabParamList>();
const PicksStack = createNativeStackNavigator<PicksStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

// Simple icon component (can be replaced with proper icons later)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const getIcon = () => {
    switch (name) {
      case 'Leaderboard':
        return '🏆';
      case 'Picks':
        return '✋';
      case 'Profile':
        return '👤';
      case 'Admin':
        return '⚙️';
      default:
        return '📱';
    }
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{getIcon()}</Text>
    </View>
  );
};

/**
 * Picks Stack Navigator
 * Handles navigation between picks-related screens
 */
function PicksNavigator() {
  return (
    <PicksStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#A42828' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: '',
        animation: 'slide_from_right',
      }}
    >
      <PicksStack.Screen
        name="PicksHome"
        component={PicksHomeScreen}
        options={{
          title: 'My Picks',
          headerBackTitle: 'Back',
        }}
      />
      <PicksStack.Screen
        name="DraftPicks"
        component={DraftPicksScreen}
        options={{
          title: 'Draft Picks',
          headerBackTitle: 'Picks',
        }}
      />
      <PicksStack.Screen
        name="WeeklyPicks"
        component={WeeklyPicksScreen}
        options={({ route }) => ({
          title: `Week ${route.params?.weekNumber || 1} Picks`,
          headerBackTitle: 'Picks',
        })}
      />
    </PicksStack.Navigator>
  );
}

/**
 * Profile Stack Navigator
 * Handles navigation between profile and league screens
 */
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#A42828' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: '',
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <ProfileStack.Screen
        name="MyLeagues"
        component={MyLeaguesScreen}
        options={{
          title: 'My Leagues',
          headerBackTitle: 'Profile',
        }}
      />
      <ProfileStack.Screen
        name="JoinLeague"
        component={JoinLeagueScreen}
        options={{
          title: 'Join League',
          headerBackTitle: 'Back',
        }}
      />
    </ProfileStack.Navigator>
  );
}

/**
 * Admin Stack Navigator
 * Handles navigation between admin screens
 */
function AdminNavigator() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#A42828' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: '',
        animation: 'slide_from_right',
      }}
    >
      <AdminStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Admin',
          headerShown: false,
        }}
      />
      <AdminStack.Screen
        name="WeeklyScoring"
        component={WeeklyScoringScreen}
        options={{
          title: 'Weekly Scoring',
          headerBackTitle: 'Admin',
        }}
      />
      <AdminStack.Screen
        name="CastawayManager"
        component={CastawayManagerScreen}
        options={{
          title: 'Castaway Manager',
          headerBackTitle: 'Admin',
        }}
      />
      <AdminStack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          title: 'User Management',
          headerBackTitle: 'Admin',
        }}
      />
      <AdminStack.Screen
        name="LeagueManagement"
        component={LeagueManagementScreen}
        options={{
          title: 'League Management',
          headerBackTitle: 'Admin',
        }}
      />
    </AdminStack.Navigator>
  );
}

/**
 * Main Tab Navigator
 */
export default function MainNavigator() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#A42828',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: { backgroundColor: '#A42828' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        lazy: true,
        unmountOnBlur: false,
      })}
    >
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Leaderboard',
          headerShown: true,
          tabBarLabel: 'Leaderboard',
        }}
      />
      <Tab.Screen
        name="Picks"
        component={PicksNavigator}
        options={{
          title: 'Picks',
          headerShown: false, // Stack has its own header
          tabBarLabel: 'Picks',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          headerShown: false, // Stack has its own header
          tabBarLabel: 'Profile',
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            title: 'Admin',
            headerShown: false, // Stack has its own header
            tabBarLabel: 'Admin',
          }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
