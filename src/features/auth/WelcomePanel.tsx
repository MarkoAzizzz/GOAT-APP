import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { WipeReveal } from '../../components/WipeReveal';
import { fonts } from '../../theme/fonts';
import { useAuth } from './AuthContext';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

function slam(delay: number) {
  return {
    from: { opacity: 0, translateY: 30, scale: 0.94 },
    animate: { opacity: 1, translateY: 0, scale: 1 },
    transition: { type: 'timing' as const, duration: 360, delay, easing: RISE_EASING },
  };
}

function rise(delay: number, duration = 300) {
  return {
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing' as const, duration, delay, easing: Easing.ease },
  };
}

/**
 * Placeholder admin home — the real roster/dashboard screens haven't been
 * built yet. Numbers here are illustrative (matching the confirmed design),
 * not live data; wire this up to a real summary endpoint once one exists.
 */
export function WelcomePanel() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={{ gap: 24 }}>
        <View style={{ gap: 10 }}>
          <WipeReveal delay={260} duration={460}>
            <Text style={styles.headline}>Welcome back, coach</Text>
          </WipeReveal>
          <MotiView {...rise(460)}>
            <Text style={styles.subtitle}>You're building more than athletes. You're building community.</Text>
          </MotiView>
        </View>

        <View style={styles.statRow}>
          <MotiView {...slam(560)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>TEAM</Text>
            <Text style={styles.statValue} numberOfLines={1}>7/10</Text>
            <Text style={styles.statSub}>assessed</Text>
          </MotiView>
          <MotiView {...slam(640)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>AVG SCORE</Text>
            <Text style={styles.statValue} numberOfLines={1}>74.2</Text>
            <Text style={[styles.statSub, { color: '#f59e0b' }]} numberOfLines={1}>↑ 3.1</Text>
          </MotiView>
          <MotiView {...slam(720)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>PENDING</Text>
            <Text style={[styles.statValue, { color: '#E11919' }]} numberOfLines={1}>3</Text>
            <Text style={styles.statSub} numberOfLines={1}>before Sunday</Text>
          </MotiView>
        </View>

        <MotiView {...rise(860)}>
          <Text style={styles.footer}>WEEK 14 · MAIN BRANCH</Text>
        </MotiView>

        <MotiView {...rise(940)} style={{ alignItems: 'center' }}>
          <Pressable onPress={logout} hitSlop={8}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 72 },
  headline: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 36,
    color: '#F5F5F5',
    textTransform: 'uppercase',
  },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: '#9BA3A7' },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    minWidth: 0,
  },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: '#9BA3A7' },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: '#F5F5F5' },
  statSub: { fontFamily: fonts.monoMedium, fontSize: 11, color: '#9BA3A7' },
  footer: { fontFamily: fonts.mono, fontSize: 13, color: '#9BA3A7', textAlign: 'center' },
  logout: {
    marginTop: 4,
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 1.6,
    color: '#E11919',
    textTransform: 'uppercase',
  },
});
