/**
 * Offline Banner Component
 *
 * Shows a banner when device is offline
 * Displays sync progress when processing queue
 * Skill 28: Accessibility - announces connection status changes
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useOffline } from '../context/OfflineContext';

export default function OfflineBanner() {
  const { isConnected, pendingRequests, processingQueue } = useOffline();
  const previousConnected = useRef(isConnected);

  // Skill 28: Announce connection status changes to VoiceOver
  useEffect(() => {
    if (previousConnected.current !== isConnected) {
      const message = isConnected
        ? 'Back online. Syncing changes.'
        : 'You are offline. Changes will sync when connected.';
      AccessibilityInfo.announceForAccessibility(message);
      previousConnected.current = isConnected;
    }
  }, [isConnected]);

  if (isConnected && !processingQueue && pendingRequests === 0) {
    return null;
  }

  const getMessage = () => {
    if (!isConnected) {
      return pendingRequests > 0
        ? `Offline - ${pendingRequests} changes pending`
        : 'No internet connection';
    }
    if (processingQueue) {
      return 'Syncing changes...';
    }
    return null;
  };

  const message = getMessage();
  if (!message) return null;

  return (
    <View
      style={[styles.banner, !isConnected ? styles.offline : styles.syncing]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Text style={styles.text} accessibilityElementsHidden={true}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offline: {
    backgroundColor: '#F59E0B',
  },
  syncing: {
    backgroundColor: '#3B82F6',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
