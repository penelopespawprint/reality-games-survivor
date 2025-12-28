/**
 * Push Notification Service
 *
 * Handles push notifications for RGFL Mobile
 * Skills: 10 (Push notifications), 18 (Mobile performance)
 *
 * Notifications:
 * - Weekly picks reminder (before episode airs)
 * - Score updates (after episode)
 * - League activity (new members, messages)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications
 * Returns the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Only works on physical devices
  if (!Device.isDevice) {
    console.log('ℹ️ Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Push notification permission denied');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || 'rgfl-survivor',
    });

    console.log('✅ Push token:', token.data);

    // Register token with backend
    await registerTokenWithBackend(token.data);

    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await api.post('/api/users/push-token', { token });
    console.log('✅ Push token registered with backend');
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}

/**
 * Schedule a local notification
 * Useful for picks reminders
 */
export async function schedulePicksReminder(
  weekNumber: number,
  episodeDate: Date
): Promise<string | null> {
  // Schedule 2 hours before episode
  const reminderDate = new Date(episodeDate.getTime() - 2 * 60 * 60 * 1000);

  // Don't schedule if in the past
  if (reminderDate < new Date()) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏝️ Make Your Picks!',
      body: `Week ${weekNumber} picks close soon. Don't forget to submit!`,
      data: { weekNumber, type: 'picks_reminder' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  console.log(`✅ Scheduled reminder for Week ${weekNumber}`);
  return notificationId;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('✅ All notifications cancelled');
}

/**
 * Add notification response listener
 * Call in App.tsx useEffect
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export default {
  register: registerForPushNotifications,
  schedulePicksReminder,
  cancelAll: cancelAllNotifications,
  addResponseListener: addNotificationResponseListener,
  addReceivedListener: addNotificationReceivedListener,
  getBadgeCount,
  setBadgeCount,
  clearBadge,
};
