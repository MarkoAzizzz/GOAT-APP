import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { WipeReveal } from '../../components/WipeReveal';
import { fonts } from '../../theme/fonts';
import { useAuth } from './AuthContext';
import { useStudentSelf } from '../student/useStudentSelf';

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
 * The student's "standing" panel — the beat between logging in and the app
 * itself. Rank, rating and last change are live; tapping anywhere hands off
 * to the student shell.
 *
 * Stats are loaded here rather than in the shell so they're already resolved
 * by the time the zoom-through lands, instead of the cards popping in
 * mid-animation.
 */
export function StudentWelcomePanel({ onContinue }: { onContinue: () => void }) {
  const { user, logout } = useAuth();
  const name = user?.full_name || 'athlete';
  const { progress, entry, loading } = useStudentSelf();

  const rank = entry?.rank ?? null;
  const prevRank = entry?.previous_rank ?? null;
  // previous_rank - rank: positive means they climbed (7 -> 4 reads as +3).
  const rankMove = rank != null && prevRank != null ? prevRank - rank : null;
  const rating = progress?.current_rating ?? null;
  const change = progress?.rating_change ?? null;

  const dash = loading ? '…' : '—';

  return (
    <Pressable style={styles.container} onPress={onContinue} accessibilityRole="button">
      <View style={{ gap: 24 }}>
        <View style={{ gap: 10 }}>
          <MotiView {...rise(260)}>
            <Text style={styles.kicker}>Welcome back</Text>
          </MotiView>
          <WipeReveal delay={340} duration={460}>
            <Text style={styles.headline}>{name}</Text>
          </WipeReveal>
        </View>

        <View style={styles.statRow}>
          <MotiView {...slam(520)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>RANK</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {rank != null ? `#${rank}` : dash}
            </Text>
            <Text
              style={[styles.statSub, { color: (rankMove ?? 0) >= 0 ? '#10b981' : '#E11919' }]}
              numberOfLines={1}
            >
              {rankMove != null && rankMove !== 0
                ? `${rankMove > 0 ? '↑' : '↓'} ${Math.abs(rankMove)}`
                : ' '}
            </Text>
          </MotiView>
          <MotiView {...slam(600)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>RATING</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {rating != null ? rating.toFixed(0) : dash}
            </Text>
            <Text style={styles.statSub} numberOfLines={1}>pts</Text>
          </MotiView>
          <MotiView {...slam(680)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>CHANGE</Text>
            <Text
              style={[
                styles.statValue,
                change != null && change !== 0
                  ? { color: change > 0 ? '#10b981' : '#E11919' }
                  : null,
              ]}
              numberOfLines={1}
            >
              {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(0)}` : dash}
            </Text>
            <Text style={styles.statSub} numberOfLines={1}>last session</Text>
          </MotiView>
        </View>

        <MotiView {...rise(860)}>
          <Text style={styles.footer}>TAP ANYWHERE TO CONTINUE</Text>
        </MotiView>

        <MotiView {...rise(940)} style={{ alignItems: 'center' }}>
          <Pressable onPress={logout} hitSlop={8}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </MotiView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 72 },
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 3.4,
    color: '#9BA3A7',
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 40,
    lineHeight: 42,
    color: '#F5F5F5',
    textTransform: 'uppercase',
  },
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
