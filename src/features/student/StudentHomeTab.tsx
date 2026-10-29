import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { StudentSelf } from './useStudentSelf';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';
import { PackageBanner } from '../packages/PackageBanner';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#10b981';

// Mirrors GoatMascotBackdrop: same asset aspect and same top offset, so
// Home can lay itself out around the backdrop without measuring it.
const MASCOT_ASPECT = 1176 / 1338;
const MASCOT_TOP = 40;
/** How far down the mascot the title sits. Lower = everything shifts up,
 * which is what buys room for the coach note above the tab bar. */
const TITLE_AT = 0.58;

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 22 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 340, delay, easing: RISE_EASING },
  };
}

function slam(delay: number) {
  return {
    from: { opacity: 0, translateY: 30, scale: 0.94 },
    animate: { opacity: 1, translateY: 0, scale: 1 },
    transition: { type: 'timing' as const, duration: 360, delay, easing: RISE_EASING },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function StudentHomeTab({ self }: { self: StudentSelf }) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { student, progress, entry, streak, loading, failed } = self;

  /**
   * Home's content is pushed down so it sits under the shared mascot rather
   * than over it. The backdrop is mounted at screen top + 40 and sized from
   * the window width by the asset's own aspect ratio (GoatMascotBackdrop),
   * so its extent is derivable rather than guessed. The title lands at 72%
   * down the mascot — dark enough there to stay legible — and the cards
   * follow below it. StudentShell already applies the top inset, so that's
   * subtracted back out here.
   */
  const mascotHeight = windowWidth / MASCOT_ASPECT;
  const titleTop = Math.max(0, MASCOT_TOP + mascotHeight * TITLE_AT - insets.top);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (failed || !student) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load your profile.</Text>
      </View>
    );
  }

  const history = progress?.history ?? [];
  const latest = history.length > 0 ? history[history.length - 1] : null;
  const rank = entry?.rank ?? null;
  const prevRank = entry?.previous_rank ?? null;
  // previous_rank - rank: positive means they climbed (rank 7 -> 4 = +3).
  const rankMove = rank != null && prevRank != null ? prevRank - rank : null;

  const eyebrow = latest
    ? `Last assessed ${formatDate(latest.assessment_date)}${student.branch_name ? ` · ${student.branch_name}` : ''}`
    : student.branch_name || 'Not assessed yet';

  const contentWidth = windowWidth - 48;
  const statGap = 12;
  const statWidth = (contentWidth - statGap) / 2;

  return (
    <View style={styles.screen}>
      <MotiView {...rise(0)} style={[styles.header, { marginTop: titleTop }]}>
        <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
        <Text style={styles.title}>This week</Text>
      </MotiView>

      <View style={styles.body}>
        {/* Above the streak: running out of sessions outranks a streak. */}
        <PackageBanner sessionPackage={self.sessionPackage} />

        {streak > 0 ? (
          <MotiView {...rise(60)} style={styles.streakCard}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{streak}</Text>
            </View>
            <View style={{ width: contentWidth - 40 - 48 - 16 }}>
              <Text style={styles.streakTitle} numberOfLines={1}>
                {streak}-week streak
              </Text>
              <Text style={styles.streakSub} numberOfLines={2}>
                {streak === 1
                  ? 'Get assessed again next week to build it'
                  : 'Keep showing up to extend it'}
              </Text>
            </View>
          </MotiView>
        ) : null}

        <MotiView {...slam(140)} style={styles.statRow}>
          <View style={[styles.statCard, { width: statWidth }]}>
            <Text style={styles.statLabel}>RANK</Text>
            <Text style={styles.statValue}>{rank != null ? `#${rank}` : '—'}</Text>
            {rankMove != null && rankMove !== 0 ? (
              <Text style={[styles.statMove, { color: rankMove > 0 ? GAIN : RED }]}>
                {rankMove > 0 ? '↑' : '↓'} {Math.abs(rankMove)}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statCard, { width: statWidth, marginLeft: statGap }]}>
            <Text style={styles.statLabel}>RATING</Text>
            <Text style={styles.statValue}>
              {progress?.current_rating != null ? progress.current_rating.toFixed(0) : '—'}
            </Text>
            {progress?.rating_change != null && progress.rating_change !== 0 ? (
              <Text
                style={[styles.statMove, { color: progress.rating_change > 0 ? GAIN : RED }]}
              >
                {progress.rating_change > 0 ? '+' : ''}
                {progress.rating_change.toFixed(0)}
              </Text>
            ) : null}
          </View>
        </MotiView>

        {latest?.coach_notes ? (
          <MotiView {...rise(220)} style={styles.noteCard}>
            <Text style={styles.noteLabel}>
              COACH NOTE · {formatDate(latest.assessment_date).toUpperCase()}
            </Text>
            <Text style={styles.noteBody}>“{latest.coach_notes}”</Text>
          </MotiView>
        ) : null}

        {history.length === 0 ? (
          <MotiView {...rise(220)} style={styles.noteCard}>
            <Text style={styles.noteLabel}>GETTING STARTED</Text>
            <Text style={styles.noteBody}>
              You haven't been assessed yet. Your rating and rank appear here after your first
              session is scored.
            </Text>
          </MotiView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7' },
  // Fixed screen, not a scroll view: Home is a glance, and everything is
  // sized to fit between the mascot and the tab bar.
  screen: { flex: 1, paddingBottom: 16 },

  // No mascot of its own: the single shared GoatMascotBackdrop shows through
  // from RootAuthScreen, exactly as it does on the admin side. The top
  // offset that clears it is applied inline, since it depends on the window.
  header: { paddingHorizontal: 24, paddingRight: 24 + SIGN_OUT_CLEARANCE, gap: 3 },
  eyebrow: { fontFamily: fonts.body, fontSize: 12.5, color: '#9BA3A7' },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },

  body: { paddingHorizontal: 24, paddingTop: 20, gap: 16 },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,.3)',
    borderRadius: 16,
    padding: 20,
  },
  streakBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#141010',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  streakBadgeText: { fontFamily: fonts.monoMedium, fontSize: 22, color: RED },
  streakTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5F5F5',
    textTransform: 'uppercase',
  },
  streakSub: { fontFamily: fonts.body, fontSize: 12.5, color: '#9BA3A7', marginTop: 2 },

  statRow: { flexDirection: 'row' },
  statCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  statLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: '#9BA3A7' },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 24, color: '#F5F5F5' },
  statMove: { fontFamily: fonts.mono, fontSize: 11 },

  noteCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  noteLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4, color: '#9BA3A7' },
  noteBody: { fontFamily: fonts.body, fontSize: 14, color: '#F5F5F5', lineHeight: 21 },
});
