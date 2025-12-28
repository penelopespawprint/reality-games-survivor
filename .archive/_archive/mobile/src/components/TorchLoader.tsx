/**
 * TorchLoader Component (React Native)
 *
 * Animated torch loading indicator matching the RGFL logo.
 * Uses React Native Animated API for flame flickering effect.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';

interface TorchLoaderProps {
  /** Optional loading message */
  message?: string;
  /** Size: 'small' (40px), 'medium' (80px), 'large' (120px) */
  size?: 'small' | 'medium' | 'large';
  /** Additional style for container */
  style?: ViewStyle;
}

const SIZES = {
  small: 0.5,
  medium: 1,
  large: 1.5,
};

/**
 * Animated torch loading indicator
 */
export function TorchLoader({
  message,
  size = 'medium',
  style,
}: TorchLoaderProps) {
  const scale = SIZES[size];

  // Animation values
  const outerFlameHeight = useRef(new Animated.Value(50)).current;
  const middleFlameHeight = useRef(new Animated.Value(40)).current;
  const innerFlameHeight = useRef(new Animated.Value(28)).current;
  const glowOpacity = useRef(new Animated.Value(0.7)).current;
  const spark1Y = useRef(new Animated.Value(0)).current;
  const spark2Y = useRef(new Animated.Value(0)).current;
  const spark3Y = useRef(new Animated.Value(0)).current;
  const spark1Opacity = useRef(new Animated.Value(0)).current;
  const spark2Opacity = useRef(new Animated.Value(0)).current;
  const spark3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer flame animation
    const outerFlameAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(outerFlameHeight, {
          toValue: 55,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(outerFlameHeight, {
          toValue: 48,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(outerFlameHeight, {
          toValue: 53,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(outerFlameHeight, {
          toValue: 50,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    // Middle flame animation
    const middleFlameAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(middleFlameHeight, {
          toValue: 44,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(middleFlameHeight, {
          toValue: 38,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(middleFlameHeight, {
          toValue: 40,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    // Inner flame animation
    const innerFlameAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(innerFlameHeight, {
          toValue: 32,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(innerFlameHeight, {
          toValue: 28,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    // Glow animation
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Spark animations
    const createSparkAnim = (
      sparkY: Animated.Value,
      sparkOpacity: Animated.Value,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(sparkY, {
              toValue: -60,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(sparkOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(sparkOpacity, {
                toValue: 0,
                duration: 1800,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(sparkY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const spark1Anim = createSparkAnim(spark1Y, spark1Opacity, 0);
    const spark2Anim = createSparkAnim(spark2Y, spark2Opacity, 700);
    const spark3Anim = createSparkAnim(spark3Y, spark3Opacity, 1400);

    // Start all animations
    outerFlameAnim.start();
    middleFlameAnim.start();
    innerFlameAnim.start();
    glowAnim.start();
    spark1Anim.start();
    spark2Anim.start();
    spark3Anim.start();

    return () => {
      outerFlameAnim.stop();
      middleFlameAnim.stop();
      innerFlameAnim.stop();
      glowAnim.stop();
      spark1Anim.stop();
      spark2Anim.stop();
      spark3Anim.stop();
    };
  }, [
    outerFlameHeight,
    middleFlameHeight,
    innerFlameHeight,
    glowOpacity,
    spark1Y,
    spark2Y,
    spark3Y,
    spark1Opacity,
    spark2Opacity,
    spark3Opacity,
  ]);

  return (
    <View style={[styles.container, style]} accessibilityLabel={message || 'Loading'}>
      <View style={[styles.torch, { transform: [{ scale }] }]}>
        {/* Flame container */}
        <View style={styles.flameContainer}>
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity },
            ]}
          />

          {/* Outer flame */}
          <Animated.View
            style={[
              styles.flame,
              styles.outerFlame,
              { height: outerFlameHeight },
            ]}
          />

          {/* Middle flame */}
          <Animated.View
            style={[
              styles.flame,
              styles.middleFlame,
              { height: middleFlameHeight },
            ]}
          />

          {/* Inner flame */}
          <Animated.View
            style={[
              styles.flame,
              styles.innerFlame,
              { height: innerFlameHeight },
            ]}
          />

          {/* Sparks */}
          <Animated.View
            style={[
              styles.spark,
              {
                left: '35%',
                transform: [{ translateY: spark1Y }, { translateX: -15 }],
                opacity: spark1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                left: '55%',
                transform: [{ translateY: spark2Y }, { translateX: 12 }],
                opacity: spark2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                left: '45%',
                transform: [{ translateY: spark3Y }, { translateX: -8 }],
                opacity: spark3Opacity,
              },
            ]}
          />
        </View>

        {/* Torch handle */}
        <View style={styles.handle}>
          <View style={styles.handleWrap} />
          <View style={styles.handleWrap2} />
        </View>
      </View>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

/** Jeff Probst's famous catchphrases for loading states */
const JEFF_PHRASES = [
  "Come on in!",
  "Worth playing for?",
  "Dig deep!",
  "You gotta dig!",
  "Survivors ready?",
  "Want to know what you're playing for?",
  "I got nothin' for ya.",
  "Once again, immunity is back up for grabs.",
];

/** Get a random Jeff catchphrase */
function getRandomPhrase(): string {
  return JEFF_PHRASES[Math.floor(Math.random() * JEFF_PHRASES.length)];
}

/**
 * Full page loading state with torch
 */
export function PageLoader({ message }: { message?: string }) {
  return (
    <View style={styles.pageOverlay}>
      <TorchLoader size="large" message={message || getRandomPhrase()} />
    </View>
  );
}

/**
 * Inline loading state for smaller areas
 */
export function InlineLoader({ message }: { message?: string }) {
  return <TorchLoader size="small" message={message} />;
}

/**
 * Section loading state
 */
export function SectionLoader({ message }: { message?: string }) {
  return (
    <View style={styles.sectionContainer}>
      <TorchLoader size="medium" message={message || getRandomPhrase()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  torch: {
    alignItems: 'center',
  },
  flameContainer: {
    width: 50,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -5,
  },
  glow: {
    position: 'absolute',
    bottom: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 140, 0, 0.4)',
  },
  flame: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  outerFlame: {
    width: 36,
    backgroundColor: '#FF6B35',
    zIndex: 1,
  },
  middleFlame: {
    width: 26,
    backgroundColor: '#FF8C00',
    zIndex: 2,
  },
  innerFlame: {
    width: 14,
    backgroundColor: '#FFEB3B',
    zIndex: 3,
  },
  spark: {
    position: 'absolute',
    bottom: '50%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFEB3B',
  },
  handle: {
    width: 20,
    height: 60,
    backgroundColor: '#8B5A3C',
    borderRadius: 4,
    position: 'relative',
    zIndex: 0,
  },
  handleWrap: {
    position: 'absolute',
    top: 8,
    left: -2,
    right: -2,
    height: 12,
    backgroundColor: '#5C3D2E',
    borderRadius: 2,
  },
  handleWrap2: {
    position: 'absolute',
    top: 24,
    left: -2,
    right: -2,
    height: 8,
    backgroundColor: '#5C3D2E',
    borderRadius: 2,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  pageOverlay: {
    flex: 1,
    backgroundColor: '#F3EED9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});

export default TorchLoader;
