/**
 * AnimatedSplash - Epic torch-focused loading screen
 * 
 * Features:
 * - Flickering animated flame
 * - Rising ember particles
 * - Pulsing glow effect
 * - Logo fade-in reveal
 * - Smooth exit transition
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Ember particle component
const Ember = ({ delay, startX }: { delay: number; startX: number }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Start animation after delay
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-300, { duration: 2500, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    
    // Horizontal drift
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(Math.random() * 40 - 20, { duration: 1200 }),
          withTiming(Math.random() * 40 - 20, { duration: 1300 })
        ),
        -1,
        true
      )
    );
    
    // Fade in, stay, fade out
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.8, { duration: 1700 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        false
      )
    );

    // Pulse scale
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(0.6, { duration: 2100 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ember,
        { left: startX },
        animatedStyle,
      ]}
    />
  );
};

// Flame flicker component
const FlameLayer = ({ 
  color, 
  size, 
  flickerSpeed,
  offsetY = 0 
}: { 
  color: string; 
  size: number; 
  flickerSpeed: number;
  offsetY?: number;
}) => {
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scaleX.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: flickerSpeed }),
        withTiming(0.9, { duration: flickerSpeed * 0.8 }),
        withTiming(1.05, { duration: flickerSpeed * 0.6 })
      ),
      -1,
      true
    );

    scaleY.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: flickerSpeed * 0.9 }),
        withTiming(0.95, { duration: flickerSpeed }),
        withTiming(1.1, { duration: flickerSpeed * 0.7 })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: flickerSpeed * 0.5 }),
        withTiming(0.7, { duration: flickerSpeed * 0.4 }),
        withTiming(0.9, { duration: flickerSpeed * 0.6 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.flame,
        {
          width: size,
          height: size * 1.5,
          backgroundColor: color,
          bottom: offsetY,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
  isLoading?: boolean;
}

export default function AnimatedSplash({ 
  onAnimationComplete, 
  isLoading = true 
}: AnimatedSplashProps) {
  // Main animations
  const torchScale = useSharedValue(0);
  const torchOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(30);
  const containerOpacity = useSharedValue(1);

  const handleComplete = useCallback(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    // Sequence: Torch appears → Glow pulses → Logo fades in
    
    // 1. Torch entrance (dramatic scale up)
    torchOpacity.value = withTiming(1, { duration: 400 });
    torchScale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    });

    // 2. Glow effect starts
    glowOpacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      )
    );
    
    glowScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      )
    );

    // 3. Logo reveal
    logoOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    logoTranslateY.value = withDelay(
      600,
      withSpring(0, { damping: 15, stiffness: 80 })
    );
  }, []);

  // Exit animation when loading completes
  useEffect(() => {
    if (!isLoading) {
      containerOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      });
    }
  }, [isLoading]);

  const torchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: torchScale.value }],
    opacity: torchOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Generate ember particles
  const embers = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 200,
    startX: SCREEN_WIDTH / 2 - 30 + Math.random() * 60,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <LinearGradient
        colors={['#1a0a0a', '#2d1515', '#1a0a0a']}
        style={styles.background}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Ambient glow behind torch */}
      <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 100, 0, 0.4)', 'rgba(255, 50, 0, 0.2)', 'transparent']}
          style={styles.glow}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Torch and flame container */}
      <Animated.View style={[styles.torchContainer, torchAnimatedStyle]}>
        {/* Ember particles */}
        <View style={styles.embersContainer}>
          {embers.map((ember) => (
            <Ember key={ember.id} delay={ember.delay} startX={ember.startX - SCREEN_WIDTH / 2 + 30} />
          ))}
        </View>

        {/* Flame layers (back to front for depth) */}
        <View style={styles.flameContainer}>
          <FlameLayer color="#FF2200" size={50} flickerSpeed={150} offsetY={-5} />
          <FlameLayer color="#FF6600" size={40} flickerSpeed={120} offsetY={0} />
          <FlameLayer color="#FFAA00" size={28} flickerSpeed={100} offsetY={5} />
          <FlameLayer color="#FFDD44" size={16} flickerSpeed={80} offsetY={10} />
        </View>

        {/* Torch handle */}
        <View style={styles.torchHandle}>
          <LinearGradient
            colors={['#8B4513', '#5D3A1A', '#3D2512']}
            style={styles.torchHandleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {/* Torch head/cup */}
          <View style={styles.torchHead}>
            <LinearGradient
              colors={['#CD7F32', '#8B4513', '#654321']}
              style={styles.torchHeadGradient}
            />
          </View>
        </View>
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('../../assets/images/rgfl-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Reality Games: Survivor</Text>
      </Animated.View>

      {/* Subtle loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <LoadingDot key={i} delay={i * 200} />
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// Animated loading dot
const LoadingDot = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.loadingDot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowContainer: {
    position: 'absolute',
    width: 300,
    height: 400,
    top: SCREEN_HEIGHT * 0.2,
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },
  torchContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  embersContainer: {
    position: 'absolute',
    width: 60,
    height: 300,
    bottom: 120,
    alignItems: 'center',
  },
  ember: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6600',
    bottom: 0,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  flameContainer: {
    width: 60,
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flame: {
    position: 'absolute',
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  torchHandle: {
    width: 20,
    height: 120,
    borderRadius: 4,
    overflow: 'hidden',
  },
  torchHandleGradient: {
    flex: 1,
  },
  torchHead: {
    position: 'absolute',
    top: -15,
    left: -10,
    width: 40,
    height: 30,
    borderRadius: 6,
    overflow: 'hidden',
  },
  torchHeadGradient: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    width: 200,
    height: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F3EED9',
    marginTop: 12,
    textShadowColor: 'rgba(255, 100, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6600',
  },
});
