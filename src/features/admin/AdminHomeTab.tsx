import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getLeaderboard, LeaderboardEntry } from '../leaderboard/leaderboardService';
import { getStudents, isAssessedThisMonth } from '../students/studentsService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

function rise(delay: number, duration = 320) {
  return {
    from: { opacity: 0, translateY: 22 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration, delay, easing: RISE_EASING },
  };
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatToday() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${now.getDate()} ${month}`;
}

type AdminHomeTabProps = {
  onStartScoring: () => void;
  onOpenBoard: () => void;
  onSelectStudent: (studentUuid: string) => void;
};

/**
 * "Assessed" count uses the exact same calendar-month cutoff as the Score
 * tab's "Not assessed" filter (isAssessedThisMonth) — sharing the predicate
 * is what keeps these two screens from disagreeing with each other. Top
 * movers is real data from the leaderboard endpoint, sorted by improvement
 * (its natural ordering).
 */
export function AdminHomeTab({ onStartScoring, onOpenBoard, onSelectStudent }: AdminHomeTabProps) {
  const { accessToken } = useAuth();
  const [movers, setMovers] = useState<LeaderboardEntry[]>([]);
  const [assessedCount, setAssessedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getLeaderboard(accessToken)
      .then((entries) => setMovers(entries.slice(0, 3)))
      .catch(() => setMovers([]));
    getStudents(accessToken)
      .then((students) => {
        // Deactivated students don't belong in either side of this ratio —
        // they're not expected to be assessed, and shouldn't inflate the
        // "left to do" count either.
        const active = students.filter((s) => s.is_active);
        setTotalCount(active.length);
        setAssessedCount(active.filter(isAssessedThisMonth).length);
      })
      .catch(() => {
        setTotalCount(null);
        setAssessedCount(null);
      });
  }, [accessToken]);

  const remaining = totalCount != null && assessedCount != null ? totalCount - assessedCount : null;
  const progressRatio = totalCount ? (assessedCount ?? 0) / totalCount : 0;

  return (
    <View style={styles.container}>
      <MotiView {...rise(0)} style={styles.headerRow}>
        <View style={{ gap: 2 }}>
          <Text style={styles.eyebrow}>{formatToday()}</Text>
          <Text style={styles.title}>This week</Text>
        </View>
      </MotiView>

      <MotiView {...rise(60)} style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View style={{ gap: 4 }}>
            <Text style={styles.progressLabel}>ASSESSED THIS MONTH</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.progressValue}>{assessedCount ?? '—'}</Text>
              <Text style={styles.progressOf}>/ {totalCount ?? '—'}</Text>
            </View>
          </View>
          <Text style={styles.progressNote}>
            {remaining != null ? `${remaining} student${remaining === 1 ? '' : 's'} left` : ''}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: `${Math.round(progressRatio * 100)}%` }}
            transition={{ type: 'timing', duration: 620, delay: 220, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }}
            style={styles.progressFill}
          />
        </View>
        <Pressable onPress={onStartScoring} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Start scoring</Text>
        </Pressable>
      </MotiView>

      <View style={{ gap: 12 }}>
        <MotiView {...rise(120)} style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Top movers</Text>
          <Pressable onPress={onOpenBoard}>
            <Text style={styles.link}>Board</Text>
          </Pressable>
        </MotiView>

        {movers.map((m, i) => {
          const change = m.rating_change === null ? null : parseFloat(m.rating_change);
          const positive = change !== null && change > 0;
          return (
            <MotiView {...rise(180 + i * 60)} key={m.student_id}>
              <Pressable
                onPress={() => onSelectStudent(m.student_uuid)}
                android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                style={styles.moverRow}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.student_name)}</Text>
                </View>
                <View style={styles.moverIdentity}>
                  <Text style={styles.moverName} numberOfLines={1}>{m.student_name}</Text>
                  <Text style={styles.moverMeta} numberOfLines={1}>{m.student_id} · {m.sport}</Text>
                </View>
                <View style={styles.moverStats}>
                  <Text
                    style={[
                      styles.moverChange,
                      { color: change === null ? '#9BA3A7' : positive ? '#10b981' : '#E11919' },
                    ]}
                  >
                    {change === null ? 'NEW' : `${positive ? '+' : ''}${change.toFixed(0)}`}
                  </Text>
                  <Text style={styles.moverRating}>
                    {m.current_rating === null ? '—' : parseFloat(m.current_rating).toFixed(0)}
                  </Text>
                </View>
              </Pressable>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7' },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },
  progressCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  progressTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  progressLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, color: '#9BA3A7' },
  progressValue: { fontFamily: fonts.monoMedium, fontSize: 40, color: '#F5F5F5' },
  progressOf: { fontFamily: fonts.mono, fontSize: 18, color: '#9BA3A7' },
  progressNote: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7', textAlign: 'right', lineHeight: 18 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E11919', borderRadius: 4 },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#F5F5F5' },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: '#F5F5F5' },
  link: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#9BA3A7' },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 14,
    overflow: 'hidden',
  },
  moverIdentity: { flex: 1, gap: 2, marginLeft: 14 },
  moverStats: { alignItems: 'flex-end', gap: 2, marginLeft: 14 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#9BA3A7' },
  moverName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  moverMeta: { fontFamily: fonts.mono, fontSize: 12, color: '#9BA3A7' },
  moverChange: { fontFamily: fonts.monoMedium, fontSize: 16 },
  moverRating: { fontFamily: fonts.mono, fontSize: 11, color: '#9BA3A7' },
});
