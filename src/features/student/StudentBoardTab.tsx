import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getLeaderboard, LeaderboardEntry } from '../leaderboard/leaderboardService';
import { StudentSelf } from './useStudentSelf';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#10b981';
const MUTED = '#9BA3A7';

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 18 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 340, delay, easing: RISE_EASING },
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

/** Podium metals, warmed slightly so they sit with the brand red rather than fight it. */
const MEDAL = ['#F5C451', '#C7CBD1', '#C8803C'];

type SportFilter = 'all' | 'boxing' | 'kickboxing';

const FILTERS: { key: SportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'boxing', label: 'Boxing' },
  { key: 'kickboxing', label: 'Kickboxing' },
];

/** `rating_change` is null on a student's first assessment — nothing to compare to. */
function changeLabel(raw: string | null) {
  if (raw === null) return { text: 'NEW', color: MUTED };
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return { text: '—', color: MUTED };
  if (value > 0) return { text: `+${value.toFixed(0)}`, color: GAIN };
  if (value < 0) return { text: value.toFixed(0), color: RED };
  return { text: '0', color: MUTED };
}

function ratingLabel(raw: string | null) {
  if (raw === null) return '—';
  const value = parseFloat(raw);
  return Number.isNaN(value) ? '—' : value.toFixed(0);
}

/**
 * Rank movement since the last recompute. `previous_rank` is null the first
 * time ranks are assigned, which is not the same as "held position" — so that
 * case renders blank rather than a misleading dash.
 */
function movement(entry: LeaderboardEntry) {
  if (entry.rank == null || entry.previous_rank == null) return null;
  const delta = entry.previous_rank - entry.rank;
  if (delta > 0) return { text: `▲${delta}`, color: GAIN };
  if (delta < 0) return { text: `▼${Math.abs(delta)}`, color: RED };
  return { text: '–', color: '#5C6266' };
}

/**
 * The student-facing Board. Mirrors the admin board — same ranking, podium
 * and movement badges — with two differences: the signed-in student's own
 * row is highlighted and labelled, and rows aren't tappable, since a student
 * has no permission to open anyone else's profile.
 */
export function StudentBoardTab({ self }: { self: StudentSelf }) {
  const { accessToken } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SportFilter>('all');

  const myId = self.student?.id ?? null;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    getLeaderboard(accessToken)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  // The API orders by rating change (for Home's "top movers"); the Board wants
  // rating order, so sort by the server-assigned rank.
  const ranked = useMemo(() => {
    const bySport = entries.filter((e) => filter === 'all' || e.sport === filter);
    return [...bySport].sort((a, b) => {
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
  }, [entries, filter]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const contentWidth = windowWidth - 48;
  const SCORE_W = 76;
  const identityWidth = contentWidth - 26 - 30 - 38 - 14 - SCORE_W - 12;

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MotiView {...rise(0)} style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Board</Text>
          <Text style={styles.subtitle}>Ranked by rating</Text>
        </View>
        <Text style={styles.count}>{ranked.length} ranked</Text>
      </MotiView>

      <MotiView {...rise(50)} style={styles.chipRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </MotiView>

      {ranked.length === 0 ? (
        <Text style={styles.emptyText}>
          No one is ranked yet. The board opens once assessments are in.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Podium order is 2 · 1 · 3 so first place sits centre and tallest. */}
          <MotiView {...rise(100)} style={styles.podium}>
            {[podium[1], podium[0], podium[2]].map((entry, slot) => {
              if (!entry) return <View key={`empty-${slot}`} style={styles.podiumColumn} />;
              const place = slot === 1 ? 0 : slot === 0 ? 1 : 2;
              const medal = MEDAL[place];
              const change = changeLabel(entry.rating_change);
              const isMe = entry.student_uuid === myId;
              return (
                <View key={entry.student_uuid} style={styles.podiumColumn}>
                  <View
                    style={[
                      styles.podiumAvatar,
                      place === 0 && styles.podiumAvatarFirst,
                      { borderColor: medal },
                    ]}
                  >
                    <Text
                      style={[styles.podiumAvatarText, place === 0 && styles.podiumAvatarTextFirst]}
                    >
                      {initials(entry.student_name)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.podiumName, isMe && styles.meText]}
                    numberOfLines={1}
                  >
                    {isMe ? 'You' : entry.student_name}
                  </Text>
                  <Text style={[styles.podiumScore, place === 0 && styles.podiumScoreFirst]}>
                    {ratingLabel(entry.current_rating)}
                  </Text>
                  <Text style={[styles.podiumImprovement, { color: change.color }]}>
                    {change.text}
                  </Text>
                  <View
                    style={[
                      styles.pedestal,
                      { height: place === 0 ? 74 : place === 1 ? 56 : 42, borderColor: medal },
                    ]}
                  >
                    <Text style={[styles.pedestalRank, { color: medal }]}>{entry.rank ?? '—'}</Text>
                  </View>
                </View>
              );
            })}
          </MotiView>

          <View style={styles.list}>
            {rest.map((entry, i) => {
              const change = changeLabel(entry.rating_change);
              const move = movement(entry);
              const isMe = entry.student_uuid === myId;
              return (
                <MotiView {...rise(160 + i * 40)} key={entry.student_uuid}>
                  <View style={[styles.row, isMe && styles.rowMe]}>
                    <View style={styles.rankCell}>
                      <Text style={styles.rankNumber}>{entry.rank ?? '—'}</Text>
                      {move ? (
                        <Text style={[styles.movement, { color: move.color }]}>{move.text}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.avatar, isMe && styles.avatarMe]}>
                      <Text style={[styles.avatarText, isMe && { color: RED }]}>
                        {initials(entry.student_name)}
                      </Text>
                    </View>
                    <View style={{ width: identityWidth, gap: 3, marginLeft: 14 }}>
                      <Text style={[styles.name, isMe && styles.meText]} numberOfLines={1}>
                        {entry.student_name}
                        {isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {entry.student_id} · {entry.sport}
                      </Text>
                    </View>
                    <View style={{ width: SCORE_W, alignItems: 'flex-end', gap: 2, marginLeft: 12 }}>
                      <Text style={styles.score}>{ratingLabel(entry.current_rating)}</Text>
                      <Text style={[styles.improvement, { color: change.color }]}>{change.text}</Text>
                    </View>
                  </View>
                </MotiView>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 14 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: SIGN_OUT_CLEARANCE,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: MUTED },
  count: { fontFamily: fonts.mono, fontSize: 12, color: MUTED },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: RED, borderColor: RED },
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: MUTED },
  chipLabelActive: { color: '#F5F5F5' },

  emptyText: { fontFamily: fonts.body, fontSize: 14, color: MUTED, marginTop: 24 },

  podium: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, marginBottom: 18 },
  podiumColumn: { flex: 1, alignItems: 'center', gap: 5 },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: { width: 54, height: 54, borderRadius: 16 },
  podiumAvatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  podiumAvatarTextFirst: { fontSize: 17, color: '#F5F5F5' },
  podiumName: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#F5F5F5', textAlign: 'center' },
  podiumScore: { fontFamily: fonts.monoMedium, fontSize: 14, color: '#F5F5F5' },
  podiumScoreFirst: { fontSize: 17 },
  podiumImprovement: { fontFamily: fonts.mono, fontSize: 11 },
  pedestal: {
    alignSelf: 'stretch',
    marginTop: 4,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    paddingTop: 8,
  },
  pedestalRank: { fontFamily: fonts.displayBold, fontSize: 18 },

  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 13,
  },
  rowMe: { backgroundColor: '#141010', borderColor: 'rgba(225,25,25,0.35)' },
  rankCell: { width: 30, alignItems: 'center' },
  rankNumber: { fontFamily: fonts.monoMedium, fontSize: 15, color: '#F5F5F5' },
  movement: { fontFamily: fonts.mono, fontSize: 9.5, marginTop: 2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMe: { backgroundColor: '#1C1010' },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meText: { color: RED },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },
  score: { fontFamily: fonts.monoMedium, fontSize: 16, color: '#F5F5F5' },
  improvement: { fontFamily: fonts.mono, fontSize: 11.5 },
});
