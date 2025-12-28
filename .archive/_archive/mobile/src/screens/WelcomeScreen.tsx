/**
 * Welcome Screen - LIGHT YOUR TORCH
 *
 * Two-phase experience:
 * 1. Torch unlit - intro copy + CTA
 * 2. Torch lit - welcome message + email signup
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

// Brand Colors - Lighter Theme for Logo Visibility
const COLORS = {
  background: '#F3EED9', // Cream background - logo shows well
  backgroundLight: '#ffffff',
  white: '#ffffff',
  cream: '#F3EED9',
  brandRed: '#A42828',
  textDark: '#1a1a1a',
  textMuted: '#666666',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#FBBF24',
};

interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [isLit, setIsLit] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Animation values
  const flameScale = useRef(new Animated.Value(0)).current;
  const flameOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const phase1Opacity = useRef(new Animated.Value(1)).current;
  const phase2Opacity = useRef(new Animated.Value(0)).current;
  const phase2Slide = useRef(new Animated.Value(40)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const flameWobble = useRef(new Animated.Value(0)).current;

  // Ember particles
  const ember1Y = useRef(new Animated.Value(0)).current;
  const ember2Y = useRef(new Animated.Value(0)).current;
  const ember3Y = useRef(new Animated.Value(0)).current;
  const ember1Opacity = useRef(new Animated.Value(0)).current;
  const ember2Opacity = useRef(new Animated.Value(0)).current;
  const ember3Opacity = useRef(new Animated.Value(0)).current;

  // Button pulse animation before lit
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (!isLit) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.02,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isLit, buttonPulse]);

  // Flame effects when lit - with proper cleanup to prevent memory leaks
  useEffect(() => {
    let isMounted = true;
    let wobbleAnimation: Animated.CompositeAnimation | null = null;
    let glowAnimation: Animated.CompositeAnimation | null = null;
    const emberAnimations: Animated.CompositeAnimation[] = [];

    if (isLit) {
      // Flame wobble with cleanup
      const wobble = () => {
        if (!isMounted) return;
        wobbleAnimation = Animated.sequence([
          Animated.timing(flameWobble, {
            toValue: 1,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameWobble, {
            toValue: -1,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameWobble, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]);
        wobbleAnimation.start(() => {
          if (isMounted) wobble();
        });
      };
      wobble();

      // Glow pulse with cleanup
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation.start();

      // Floating embers with cleanup
      const animateEmber = (y: Animated.Value, opacity: Animated.Value, delay: number) => {
        const animate = () => {
          if (!isMounted) return;
          y.setValue(0);
          opacity.setValue(0);
          const anim = Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(y, {
                toValue: -100,
                duration: 2000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(opacity, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.delay(1200),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]);
          emberAnimations.push(anim);
          anim.start(() => {
            if (isMounted) animate();
          });
        };
        animate();
      };

      animateEmber(ember1Y, ember1Opacity, 0);
      animateEmber(ember2Y, ember2Opacity, 700);
      animateEmber(ember3Y, ember3Opacity, 1400);
    }

    // Cleanup function to stop all animations
    return () => {
      isMounted = false;
      wobbleAnimation?.stop();
      glowAnimation?.stop();
      emberAnimations.forEach(anim => anim.stop());
    };
  }, [isLit]);

  const handleLightTorch = () => {
    if (isLit) return;
    setIsLit(true);

    // Epic flame ignition
    Animated.parallel([
      Animated.spring(flameScale, {
        toValue: 1,
        tension: 40,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(flameOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(glowPulse, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Transition content
    setTimeout(() => {
      Animated.parallel([
        // Fade out phase 1
        Animated.timing(phase1Opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Slide in phase 2
        Animated.parallel([
          Animated.timing(phase2Opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(phase2Slide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 600);
  };

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/beta-signup', { email: email.trim() });
      setIsSubmitted(true);
    } catch (error) {
      // Even on error, show success to avoid exposing if email exists
      console.error('Beta signup error:', error);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const flameTranslateY = flameScale.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [40, -10, 0],
  });

  const flameRotate = flameWobble.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background glow when lit */}
      {isLit && (
        <Animated.View
          style={[
            styles.backgroundGlow,
            {
              opacity: glowPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.1],
              }),
            },
          ]}
        />
      )}

      {/* Login link */}
      <TouchableOpacity style={styles.loginLink} onPress={onContinue} activeOpacity={0.7}>
        <Text style={styles.loginText}>Already playing? <Text style={styles.loginBold}>Log in</Text></Text>
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/rgfl-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Title - always visible */}
      <Text style={styles.title}>Light Your Torch</Text>

      {/* Torch Section - Clickable */}
      <TouchableOpacity
        style={styles.torchSection}
        onPress={handleLightTorch}
        activeOpacity={0.9}
        disabled={isLit}
      >
        {/* Glow behind torch */}
        {isLit && (
          <Animated.View
            style={[
              styles.torchGlow,
              {
                opacity: glowPulse.interpolate({
                  inputRange: [0.6, 1],
                  outputRange: [0.4, 0.7],
                }),
                transform: [
                  {
                    scale: glowPulse.interpolate({
                      inputRange: [0.6, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Floating embers */}
        {isLit && (
          <>
            <Animated.View
              style={[styles.ember, { left: -12, opacity: ember1Opacity, transform: [{ translateY: ember1Y }] }]}
            />
            <Animated.View
              style={[styles.ember, styles.emberSmall, { left: 20, opacity: ember2Opacity, transform: [{ translateY: ember2Y }] }]}
            />
            <Animated.View
              style={[styles.ember, { left: 4, opacity: ember3Opacity, transform: [{ translateY: ember3Y }] }]}
            />
          </>
        )}

        {/* Realistic Fire - Multiple flame tongues */}
        <Animated.View
          style={[
            styles.fireContainer,
            {
              opacity: flameOpacity,
              transform: [
                { scale: flameScale },
                { translateY: flameTranslateY },
              ],
            },
          ]}
        >
          {/* Left outer flame */}
          <Animated.View style={[
            styles.flameShape,
            styles.flameLeft,
            { transform: [{ rotate: '-15deg' }, { scaleX: 0.7 }, { scaleY: 0.75 }] }
          ]}>
            <View style={styles.flameShapeInner} />
          </Animated.View>

          {/* Right outer flame */}
          <Animated.View style={[
            styles.flameShape,
            styles.flameRight,
            { transform: [{ rotate: '12deg' }, { scaleX: 0.65 }, { scaleY: 0.8 }] }
          ]}>
            <View style={styles.flameShapeInner} />
          </Animated.View>

          {/* Center main flame - tallest */}
          <Animated.View style={[
            styles.flameShape,
            styles.flameCenter,
            { transform: [{ rotate: flameRotate }] }
          ]}>
            <View style={styles.flameShapeMiddle}>
              <View style={styles.flameShapeCore} />
            </View>
          </Animated.View>

          {/* Extra small licks on sides */}
          <Animated.View style={[
            styles.flameLick,
            styles.flameLickLeft,
            { transform: [{ rotate: '-25deg' }, { scaleY: 0.6 }] }
          ]} />
          <Animated.View style={[
            styles.flameLick,
            styles.flameLickRight,
            { transform: [{ rotate: '20deg' }, { scaleY: 0.5 }] }
          ]} />
        </Animated.View>

        {/* Torch body */}
        <View style={styles.torchBowl}>
          <View style={styles.torchBowlInner} />
          <View style={styles.torchWick} />
        </View>
        <View style={styles.torchCollar} />
        <View style={styles.torchShaft}>
          <View style={styles.torchBand} />
          <View style={[styles.torchBand, { top: 30 }]} />
        </View>
        <View style={styles.torchTip} />

        {/* Tap indicator when not lit */}
        {!isLit && (
          <Text style={styles.tapHint}>Tap to light</Text>
        )}
      </TouchableOpacity>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {/* Phase 1: Before lighting */}
        <Animated.View
          style={[
            styles.phase,
            { opacity: phase1Opacity },
          ]}
          pointerEvents={isLit ? 'none' : 'auto'}
        >
          <Text style={styles.introCopy}>
            Behind every great Survivor player is a torch.{'\n'}Go ahead and grab yours.
          </Text>
          <Text style={styles.subCopy}>
            In this game, fire represents your life in the league.{'\n'}When your fire's gone, so are you.
          </Text>
        </Animated.View>

        {/* Phase 2: After lighting */}
        <Animated.View
          style={[
            styles.phase,
            {
              opacity: phase2Opacity,
              transform: [{ translateY: phase2Slide }],
              position: 'absolute',
              left: 0,
              right: 0,
            },
          ]}
          pointerEvents={isLit ? 'auto' : 'none'}
        >
          <Text style={styles.welcomeTitle}>
            Welcome to the Beta Season of Reality Games Fantasy League: Survivor Edition.
          </Text>
          <Text style={styles.welcomeCopy}>
            We built a scoring system with <Text style={styles.boldText}>100+ rules</Text> that reward real strategy. Every vote, idol play, and blindside counts.
          </Text>
          <Text style={styles.registrationInfo}>
            Registration opens early January.
          </Text>
          <Text style={styles.spotsInfo}>
            For Season 50, we're only taking <Text style={styles.boldText}>50 players</Text>.
          </Text>

          {/* Email Signup */}
          {!isSubmitted ? (
            <View style={styles.emailSection}>
              <Text style={styles.emailLabel}>Enter your email to be notified the day registration opens.</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  returnKeyType="go"
                  onSubmitEditing={handleEmailSubmit}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitBtnText}>{isSubmitting ? '...' : 'Notify Me'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>🔥</Text>
              <Text style={styles.successText}>You're on the list!</Text>
              <Text style={styles.successSub}>We'll email you when registration opens.</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },

  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.orange,
  },

  // Ambient glow effect for dark theme
  ambientGlow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    borderRadius: 150,
    backgroundColor: COLORS.orange,
    opacity: 0.05,
  },

  // Login
  loginLink: {
    alignSelf: 'flex-end',
  },
  loginText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  loginBold: {
    color: COLORS.brandRed,
    fontWeight: '700',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },

  // Title
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.brandRed,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.5,
  },

  // Torch
  torchSection: {
    alignItems: 'center',
    marginTop: 20,
    height: 160,
    justifyContent: 'flex-end',
  },
  tapHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  torchGlow: {
    position: 'absolute',
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.orange,
  },
  ember: {
    position: 'absolute',
    top: 20,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.amber,
  },
  emberSmall: {
    width: 3,
    height: 3,
    backgroundColor: COLORS.yellow,
  },
  // Fire container
  fireContainer: {
    position: 'absolute',
    top: -15,
    zIndex: 10,
    width: 70,
    height: 90,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Teardrop flame shape - pointed top, rounded bottom
  flameShape: {
    position: 'absolute',
    bottom: 0,
    width: 28,
    height: 70,
    backgroundColor: '#FF5500',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    // Make it pointy at top by scaling
    transform: [{ scaleX: 0.8 }],
    alignItems: 'center',
    justifyContent: 'center',
  },

  flameCenter: {
    width: 32,
    height: 75,
    backgroundColor: '#FF4500',
    zIndex: 3,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  flameLeft: {
    left: 5,
    width: 20,
    height: 50,
    backgroundColor: '#FF6600',
    zIndex: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },

  flameRight: {
    right: 5,
    width: 22,
    height: 55,
    backgroundColor: '#FF5F00',
    zIndex: 2,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
  },

  // Inner flame layers
  flameShapeInner: {
    width: '60%',
    height: '70%',
    backgroundColor: COLORS.amber,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -5,
  },

  flameShapeMiddle: {
    width: '65%',
    height: '75%',
    backgroundColor: COLORS.amber,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flameShapeCore: {
    width: '50%',
    height: '60%',
    backgroundColor: COLORS.yellow,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },

  // Small flame licks on edges
  flameLick: {
    position: 'absolute',
    bottom: 5,
    width: 10,
    height: 30,
    backgroundColor: '#FF7700',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    zIndex: 1,
  },

  flameLickLeft: {
    left: 0,
  },

  flameLickRight: {
    right: 0,
  },
  torchBowl: {
    width: 40,
    height: 24,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    borderColor: '#5D3A1A',
    borderBottomWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  torchBowlInner: {
    position: 'absolute',
    top: 4,
    width: 28,
    height: 14,
    backgroundColor: '#2C1810',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  torchWick: {
    position: 'absolute',
    top: -5,
    width: 5,
    height: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 2.5,
  },
  torchCollar: {
    width: 34,
    height: 8,
    backgroundColor: '#CD853F',
    borderWidth: 1.5,
    borderColor: '#8B4513',
    borderTopWidth: 0,
  },
  torchShaft: {
    width: 18,
    height: 44,
    backgroundColor: '#8B4513',
    borderWidth: 1.5,
    borderColor: '#5D3A1A',
    borderTopWidth: 0,
  },
  torchBand: {
    position: 'absolute',
    top: 10,
    left: -1.5,
    right: -1.5,
    height: 5,
    backgroundColor: '#CD853F',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  torchTip: {
    width: 10,
    height: 10,
    backgroundColor: '#5D3A1A',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
  },

  // Content Area
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  phase: {
    alignItems: 'center',
  },

  // Phase 1 - Before lighting
  introCopy: {
    fontSize: 17,
    lineHeight: 26,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  subCopy: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandRed,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: COLORS.brandRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // Phase 2 - After lighting
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  welcomeCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.orange,
  },
  registrationInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.amber,
    textAlign: 'center',
    marginBottom: 4,
  },
  spotsInfo: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Email
  emailSection: {
    width: '100%',
  },
  emailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    display: 'none', // Hide label since we use placeholder
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emailInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Success
  successBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  successEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  successText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.orange,
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
