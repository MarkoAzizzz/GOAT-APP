import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getSportAnalytics, SportAnalytics, SportAnalyticsResponse } from '../assessments/assessmentsService';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#34d399';
const WARN = '#fbbf24';
const MUTED = '#9BA3A7';

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 18 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 320, delay, easing: RISE_EASING },
  };
}

function fmt(n: number | null) {
  return n == null ? '—' : n.toFixed(0);
}

function fmtSigned(n: number | null) {
  if (n == null) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
}

/** Pillar standings run open-ended but cluster 0-100 in practice — the bar
 * scale matches StudentProgressTab's same assumption for the same reason. */
const MAX_STANDING = 100;

function SportCard({ label, accent, data }: { label: string; accent: string; data: SportAnalytics }) {
  return (
    <MotiView {...rise(60)} style={[styles.card, { borderColor: `${accent}33` }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardLabel, { color: accent }]}>{label.toUpperCase()}</Text>
        <Text style={styles.cardCount}>{data.total_members} members</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>AVG RATING</Text>
          <Text style={styles.statValue}>{fmt(data.average_rating)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>LIFETIME GAIN</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  data.average_lifetime_gain == null
                    ? '#F5F5F5'
                    : data.average_lifetime_gain >= 0
                    ? GAIN
                    : RED,
              },
            ]}
          >
            {fmtSigned(data.average_lifetime_gain)}
          </Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>ASSESSED</Text>
          <Text style={styles.statValue}>
            {data.assessed_this_month}
            <Text style={styles.statOf}>/{data.total_members}</Text>
          </Text>
        </View>
      </View>

      {data.pillar_strength.some((p) => p.average != null) ? (
        <View style={styles.pillarSection}>
          <Text style={styles.sectionLabel}>PILLAR STRENGTH</Text>
          <View style={{ gap: 8 }}>
            {data.pillar_strength.map((p) => {
              const ratio = p.average != null ? Math.max(0, Math.min(1, p.average / MAX_STANDING)) : 0;
              const barColor = p.average == null ? 'rgba(255,255,255,.1)' : p.average < 50 ? WARN : GAIN;
              return (
                <View key={p.pillar_name}>
                  <View style={styles.pillarTopRow}>
                    <Text style={styles.pillarName} numberOfLines={1}>{p.pillar_name}</Text>
                    <Text style={styles.pillarValue}>{p.average != null ? p.average.toFixed(0) : '—'}</Text>
                  </View>
                  <View style={styles.pillarTrack}>
                    <View style={[styles.pillarFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {data.most_improved.length > 0 ? (
        <View style={styles.pillarSection}>
          <Text style={styles.sectionLabel}>MOST IMPROVED</Text>
          <View style={{ gap: 6 }}>
            {data.most_improved.map((m) => (
              <View key={m.student_id} style={styles.improvedRow}>
                <Text style={styles.improvedName} numberOfLines={1}>{m.student_name}</Text>
                <Text style={[styles.improvedGain, { color: m.gain >= 0 ? GAIN : RED }]}>
                  {fmtSigned(m.gain)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No assessed members yet.</Text>
      )}
    </MotiView>
  );
}

export function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<SportAnalyticsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getSportAnalytics(accessToken)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      </View>

      {failed ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Couldn't load analytics.</Text>
        </View>
      ) : !data ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={RED} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <MotiView {...rise(0)}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Boxing and kickboxing, side by side</Text>
          </MotiView>

          <SportCard label="Boxing" accent={RED} data={data.boxing} />
          <SportCard label="Kickboxing" accent="#60a5fa" data={data.kickboxing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    paddingRight: 24 + SIGN_OUT_CLEARANCE,
  },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, gap: 14 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 6 },

  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 1.4 },
  cardCount: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },

  statRow: { flexDirection: 'row' },
  statBlock: { flex: 1, gap: 3 },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: MUTED },
  statValue: { fontFamily: fonts.displayBold, fontSize: 19, color: '#F5F5F5' },
  statOf: { fontFamily: fonts.body, fontSize: 13, color: MUTED },

  pillarSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.08)',
    paddingTop: 12,
    gap: 8,
  },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: MUTED },
  pillarTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  pillarName: { fontFamily: fonts.body, fontSize: 12.5, color: '#F5F5F5', flex: 1, marginRight: 8 },
  pillarValue: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },
  pillarTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.08)', overflow: 'hidden' },
  pillarFill: { height: '100%', borderRadius: 3 },

  improvedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  improvedName: { fontFamily: fonts.body, fontSize: 13, color: '#F5F5F5', flex: 1, marginRight: 8 },
  improvedGain: { fontFamily: fonts.monoMedium, fontSize: 13 },

  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: MUTED },
});
