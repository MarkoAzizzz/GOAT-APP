import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { MotiView } from 'moti';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { WipeReveal } from '../../components/WipeReveal';
import { fonts } from '../../theme/fonts';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/api';

const WORDMARK = require('../../../assets/goat-wordmark-transparent.png');

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

function rise(delay: number, duration = 360) {
  return {
    from: { opacity: 0, translateY: 24 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration, delay, easing: RISE_EASING },
  };
}

type LoginPanelProps = {
  onSuccess: () => void;
};

export function LoginPanel({ onSuccess }: LoginPanelProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showReset, setShowReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const bannerY = useSharedValue(-1);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const openReset = () => {
    setShowReset(true);
    bannerY.value = withTiming(0, { duration: 300, easing: RISE_EASING });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(closeReset, 4000);
  };

  const closeReset = () => {
    bannerY.value = withTiming(-1, { duration: 220, easing: Easing.in(Easing.ease) });
    setTimeout(() => setShowReset(false), 220);
    if (resetTimer.current) clearTimeout(resetTimer.current);
  };

  const handleSubmit = async () => {
    if (phase === 'loading') return;
    setPhase('loading');
    setErrorMessage('');
    progressWidth.value = 0;
    progressWidth.value = withTiming(0.92, { duration: 1000, easing: Easing.bezier(0.3, 0.7, 0.4, 1) });
    try {
      await login(email, password);
      progressWidth.value = withTiming(1, { duration: 160, easing: Easing.linear });
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.';
      setErrorMessage(message);
      setPhase('error');
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` }));
  const bannerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bannerY.value * 130 }] }));

  const isLoading = phase === 'loading';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <WipeReveal width={196} delay={520} duration={560}>
          <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />
        </WipeReveal>
        <MotiView {...rise(900, 320)}>
          <Text style={styles.tagline}>JOIN THE FAMILY</Text>
        </MotiView>
      </View>

      <View style={styles.form}>
        <MotiView {...rise(880)} style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="you@gym.com"
            placeholderTextColor="#5C6266"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, emailFocused && styles.inputFocused]}
          />
        </MotiView>

        <MotiView {...rise(1180)} style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              secureTextEntry={!pwVisible}
              placeholder="••••••••"
              placeholderTextColor="#5C6266"
              style={[styles.input, styles.inputWithToggle, pwFocused && styles.inputFocused]}
            />
            <Pressable onPress={() => setPwVisible((v) => !v)} style={styles.toggleButton} hitSlop={8}>
              <Text style={styles.toggleLabel}>{pwVisible ? 'HIDE' : 'SHOW'}</Text>
            </Pressable>
          </View>
        </MotiView>

        <MotiView {...rise(1480)} style={{ marginTop: 8 }}>
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handleSubmit}
              onPressIn={() => (buttonScale.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
              onPressOut={() => (buttonScale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
              style={styles.button}
            >
              <Text style={styles.buttonLabel}>{isLoading ? 'Walking you in' : 'Log in'}</Text>
              {isLoading && (
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
              )}
            </Pressable>
          </Animated.View>
          {phase === 'error' && <Text style={styles.errorText}>{errorMessage}</Text>}
        </MotiView>

        <MotiView {...rise(1640, 320)} style={{ alignItems: 'center', marginTop: 8 }}>
          <Pressable onPress={openReset} hitSlop={8}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </MotiView>
      </View>

      {showReset && (
        <Animated.View style={[styles.resetBanner, bannerStyle]}>
          <Pressable onPress={closeReset} style={styles.resetContent}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.resetTitle}>Locked out?</Text>
              <Text style={styles.resetBody}>Contact your admin. They'll reset it for you.</Text>
            </View>
            <Pressable onPress={closeReset} style={styles.resetClose} hitSlop={8}>
              <Text style={styles.resetCloseLabel}>×</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 44 },
  header: { alignItems: 'center', gap: 12, marginBottom: 48 },
  wordmark: { width: 196, height: 74 },
  tagline: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 3.4,
    color: '#9BA3A7',
    textTransform: 'uppercase',
  },
  form: { gap: 16 },
  field: { gap: 8 },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: '#9BA3A7',
    textTransform: 'uppercase',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: '#101010',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 16,
  },
  inputWithToggle: { paddingRight: 70 },
  inputFocused: {
    borderColor: '#E11919',
    backgroundColor: '#141414',
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(225,25,25,0.18)' } as any,
      default: {},
    }),
  },
  toggleButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  toggleLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#9BA3A7',
  },
  button: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 19,
    letterSpacing: 2.2,
    color: '#F5F5F5',
    textTransform: 'uppercase',
  },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(5,5,5,0.32)' },
  progressFill: { height: 4, backgroundColor: '#F5F5F5' },
  errorText: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#f04a4a',
  },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#9BA3A7' },
  resetBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#101010',
    borderBottomWidth: 2,
    borderBottomColor: '#E11919',
    paddingTop: 64,
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  resetContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  resetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 2.8,
    color: '#E11919',
    textTransform: 'uppercase',
  },
  resetBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: '#F5F5F5' },
  resetClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetCloseLabel: { fontFamily: fonts.mono, fontSize: 15, color: '#9BA3A7' },
});
