import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getLeaderboard, LeaderboardEntry } from '../leaderboard/leaderboardService';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

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
  if (raw === null) return { text: 'NEW', color: '#9BA3A7' };
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return { text: '—', color: '#9BA3A7' };
  if (value > 0) return { text: `+${value.toFixed(0)}`, color: '#10b981' };
  if (value < 0) return { text: value.toFixed(0), color: '#E11919' };
  return { text: '0', color: '#9BA3A7' };
}

/** Ratings are whole points (1000, 1090, …); null until a first assessment lands. */
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
  if (delta > 0) return { text: `▲${delta}`, color: '#10b981' };
  if (delta < 0) return { text: `▼${Math.abs(delta)}`, color: '#E11919' };
  return { text: '–', color: '#5C6266' };
}

type BoardTabProps = {
  onSelectStudent: (studentUuid: string) => void;
};

/**
 * The Board ranks on absolute score (`rank`, assigned server-side) with the
 * improvement delta shown alongside, so standing and momentum read at once.
 * Sport filtering is client-side: the roster is small and the API already
 * returns every entry, so chips stay instant.
 */
export function BoardTab({ onSelectStudent }: BoardTabProps) {
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SportFilter>('all');

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

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color="#E11919" />
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
            <Text style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </MotiView>

      {ranked.length === 0 ? (
        <Text style={styles.emptyText}>No one is ranked yet. Submit an assessment to open the board.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Podium order is 2 · 1 · 3 so first place sits centre and tallest. */}
          <MotiView {...rise(100)} style={styles.podium}>
            {[podium[1], podium[0], podium[2]].map((entry, slot) => {
              if (!entry) return <View key={`empty-${slot}`} style={styles.podiumColumn} />;
              const place = slot === 1 ? 0 : slot === 0 ? 1 : 2;
              const medal = MEDAL[place];
              const change = changeLabel(entry.rating_change);
              return (
                <Pressable
                  key={entry.student_uuid}
                  onPress={() => onSelectStudent(entry.student_uuid)}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                  style={styles.podiumColumn}
                >
                  <View style={[styles.podiumAvatar, place === 0 && styles.podiumAvatarFirst, { borderColor: medal }]}>
                    <Text style={[styles.podiumAvatarText, place === 0 && styles.podiumAvatarTextFirst]}>
                      {initials(entry.student_name)}
                    </Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{entry.student_name}</Text>
                  <Text style={[styles.podiumScore, place === 0 && styles.podiumScoreFirst]}>
                    {ratingLabel(entry.current_rating)}
                  </Text>
                  <Text style={[styles.podiumImprovement, { color: change.color }]}>{change.text}</Text>
                  <View
                    style={[
                      styles.pedestal,
                      { height: place === 0 ? 74 : place === 1 ? 56 : 42, borderColor: medal },
                    ]}
                  >
                    <Text style={[styles.pedestalRank, { color: medal }]}>{entry.rank ?? '—'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </MotiView>

          <View style={styles.list}>
            {rest.map((entry, i) => {
              const change = changeLabel(entry.rating_change);
              const move = movement(entry);
              return (
                <MotiView {...rise(160 + i * 40)} key={entry.student_uuid}>
                  <Pressable
                    onPress={() => onSelectStudent(entry.student_uuid)}
                    android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                    style={styles.row}
                  >
                    <View style={styles.rankCell}>
                      <Text style={styles.rankNumber}>{entry.rank ?? '—'}</Text>
                      {move ? <Text style={[styles.movement, { color: move.color }]}>{move.text}</Text> : null}
                    </View>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(entry.student_name)}</Text>
                    </View>
                    <View style={styles.identity}>
                      <Text style={styles.name} numberOfLines={1}>{entry.student_name}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{entry.student_id} · {entry.sport}</Text>
                    </View>
                    <View style={styles.scoreCell}>
                      <Text style={styles.score}>{ratingLabel(entry.current_rating)}</Text>
                      <Text style={[styles.improvement, { color: change.color }]}>{change.text}</Text>
                    </View>
                  </Pressable>
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
  // paddingRight keeps the count clear of the shell's sign-out corner.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: SIGN_OUT_CLEARANCE,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7' },
  count: { fontFamily: fonts.mono, fontSize: 12, color: '#9BA3A7' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
  },
  chipActive: { backgroundColor: '#E11919', borderColor: '#E11919' },
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#9BA3A7' },
  chipLabelActive: { color: '#F5F5F5' },

  podium: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, marginBottom: 18 },
  podiumColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: { width: 62, height: 62, borderRadius: 31 },
  podiumAvatarText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  podiumAvatarTextFirst: { fontSize: 19 },
  podiumName: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: '#F5F5F5', marginTop: 8 },
  podiumScore: { fontFamily: fonts.monoMedium, fontSize: 15, color: '#F5F5F5', marginTop: 3 },
  podiumScoreFirst: { fontSize: 19 },
  podiumImprovement: { fontFamily: fonts.mono, fontSize: 11, marginTop: 1, marginBottom: 8 },
  pedestal: {
    alignSelf: 'stretch',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    paddingTop: 8,
  },
  pedestalRank: { fontFamily: fonts.displayBold, fontSize: 26 },

  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 13,
    overflow: 'hidden',
  },
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
    marginLeft: 10,
  },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  identity: { flex: 1, gap: 3, marginLeft: 14 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: '#9BA3A7' },
  scoreCell: { alignItems: 'flex-end', gap: 2, marginLeft: 12 },
  score: { fontFamily: fonts.monoMedium, fontSize: 16, color: '#F5F5F5' },
  improvement: { fontFamily: fonts.mono, fontSize: 11.5 },

  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#9BA3A7',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
  },
});
