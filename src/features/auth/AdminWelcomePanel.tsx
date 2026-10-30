import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { WipeReveal } from '../../components/WipeReveal';
import { fonts } from '../../theme/fonts';
import { useAuth } from './AuthContext';
import { getStudents, isAssessedThisMonth } from '../students/studentsService';
import { getLeaderboard } from '../leaderboard/leaderboardService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

function rise(delay: number, duration = 300) {
  return {
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing' as const, duration, delay, easing: Easing.ease },
  };
}

function slam(delay: number) {
  return {
    from: { opacity: 0, translateY: 30, scale: 0.94 },
    animate: { opacity: 1, translateY: 0, scale: 1 },
    transition: { type: 'timing' as const, duration: 360, delay, easing: RISE_EASING },
  };
}

type AdminWelcomePanelProps = {
  onContinue: () => void;
};

/**
 * Brief admin intro between login and the tab shell — same "one continuous
 * mascot" moment students get, tap anywhere to head into the dashboard.
 * "Log out" is a sibling Pressable, not nested inside the continue-tap
 * area — nested Pressables don't reliably stop touch propagation on
 * react-native-web, so keeping them as siblings avoids an accidental
 * fall-through into the dashboard when the user meant to log out.
 *
 * TEAM / ASSESSED / AVG CHANGE reuse the same roster + leaderboard calls
 * Home makes, so this screen never disagrees with the numbers one tap away
 * from it. "Assessed" uses the same calendar-month cutoff as the Score
 * tab's "Not assessed" filter — see isAssessedThisMonth.
 */
export function AdminWelcomePanel({ onContinue }: AdminWelcomePanelProps) {
  const { user, logout, accessToken } = useAuth();
  const name = user?.full_name || 'coach';

  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [assessedCount, setAssessedCount] = useState<number | null>(null);
  const [avgChange, setAvgChange] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getStudents(accessToken)
      .then((students) => {
        const active = students.filter((s) => s.is_active);
        setTeamCount(active.length);
        setAssessedCount(active.filter(isAssessedThisMonth).length);
      })
      .catch(() => {
        setTeamCount(null);
        setAssessedCount(null);
      });
    getLeaderboard(accessToken)
      .then((entries) => {
        const changes = entries
          .map((e) => (e.rating_change == null ? null : parseFloat(e.rating_change)))
          .filter((n): n is number => n != null);
        setAvgChange(changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null);
      })
      .catch(() => setAvgChange(null));
  }, [accessToken]);

  return (
    <View style={styles.root}>
      <Pressable style={styles.tapArea} onPress={onContinue}>
        <View style={{ gap: 10 }}>
          <MotiView {...rise(260)}>
            <Text style={styles.kicker}>Welcome back</Text>
          </MotiView>
          <WipeReveal delay={340} duration={460}>
            <Text style={styles.headline}>{name}</Text>
          </WipeReveal>
        </View>

        <View style={styles.statRow}>
          <MotiView {...slam(480)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>TEAM</Text>
            <Text style={styles.statValue} numberOfLines={1}>{teamCount ?? '—'}</Text>
            <Text style={styles.statSub} numberOfLines={1}>students</Text>
          </MotiView>
          <MotiView {...slam(560)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>ASSESSED</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {assessedCount ?? '—'}/{teamCount ?? '—'}
            </Text>
            <Text style={styles.statSub} numberOfLines={1}>this month</Text>
          </MotiView>
          <MotiView {...slam(640)} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1}>AVG CHANGE</Text>
            <Text
              style={[
                styles.statValue,
                { color: avgChange == null ? '#F5F5F5' : avgChange >= 0 ? '#10b981' : '#E11919' },
              ]}
              numberOfLines={1}
            >
              {avgChange == null ? '—' : `${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)}`}
            </Text>
            <Text style={styles.statSub} numberOfLines={1}>latest session</Text>
          </MotiView>
        </View>

        <MotiView {...rise(820)}>
          <Text style={styles.footer}>TAP ANYWHERE TO CONTINUE</Text>
        </MotiView>
      </Pressable>

      <MotiView {...rise(900)} style={{ alignItems: 'center', paddingBottom: 72 }}>
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tapArea: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 24, gap: 24 },
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
