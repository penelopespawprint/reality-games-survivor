/**
 * Skeleton Loading Components
 *
 * Shimmer effect placeholders for loading states
 * Skill 28: Accessibility - announces loading state to VoiceOver
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, AccessibilityInfo } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Basic skeleton with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for leaderboard row
 */
export function LeaderboardRowSkeleton() {
  return (
    <View style={styles.leaderboardRow}>
      <Skeleton width={30} height={30} borderRadius={15} />
      <View style={styles.leaderboardContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="30%" height={12} />
      </View>
      <Skeleton width={50} height={20} />
    </View>
  );
}

/**
 * Skeleton for castaway card
 */
export function CastawayCardSkeleton() {
  return (
    <View style={styles.castawayCard}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

/**
 * Skeleton for pick row
 */
export function PickRowSkeleton() {
  return (
    <View style={styles.pickRow}>
      <Skeleton width={24} height={24} borderRadius={12} />
      <Skeleton width={50} height={50} borderRadius={25} style={{ marginLeft: 12 }} />
      <View style={styles.pickContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton for league card
 */
export function LeagueCardSkeleton() {
  return (
    <View style={styles.leagueCard}>
      <View style={styles.leagueHeader}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <View style={styles.leagueInfo}>
          <Skeleton width="70%" height={18} style={{ marginBottom: 4 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <View style={styles.leagueStats}>
        <Skeleton width="30%" height={14} />
        <Skeleton width="30%" height={14} />
      </View>
    </View>
  );
}

/**
 * Full screen loading skeleton
 * Skill 28: Accessibility - VoiceOver announces loading state
 */
export function ScreenSkeleton({ rows = 5 }: { rows?: number }) {
  useEffect(() => {
    // Announce loading to VoiceOver users (Skill 28)
    AccessibilityInfo.announceForAccessibility('Loading content, please wait');
  }, []);

  return (
    <View
      style={styles.screenContainer}
      accessible={true}
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
    >
      <Skeleton width="50%" height={28} style={{ marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          width="100%"
          height={60}
          style={{ marginBottom: 12 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  leaderboardContent: {
    flex: 1,
    marginLeft: 12,
  },
  castawayCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 120,
    marginRight: 12,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  pickContent: {
    flex: 1,
    marginLeft: 12,
  },
  leagueCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leagueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leagueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  screenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3EED9',
  },
});

export default Skeleton;
