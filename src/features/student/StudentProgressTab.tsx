import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { fonts } from '../../theme/fonts';
import { StudentSelf } from './useStudentSelf';
import { PillarScoreEntry } from '../students/studentsService';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#10b981';
const STEADY = '#60a5fa';
const MUTED = '#9BA3A7';

/**
 * Pillar standings are an aggregate of their criteria, not a criterion score:
 * observed range is roughly 0-100 (and can dip slightly negative), whereas a
 * single criterion is 0-10. The bar is drawn against 100 and clamped.
 */
const MAX_STANDING = 100;

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
    transition: { type: 'timing' as const, duration: 340, delay, easing: RISE_EASING },
  };
}

function num(value: string | null): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function trendColor(delta: number | null): string {
  if (delta == null) return MUTED;
  if (delta > 0) return GAIN;
  if (delta < 0) return RED;
  return STEADY;
}

function formatTrend(delta: number | null): string {
  if (delta == null) return '–';
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return '0';
  const text = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? '↑' : '↓'} ${text}`;
}

type SparklineProps = {
  ratings: number[];
  width: number;
};

/**
 * Rating over time. The scale is derived from the data rather than pinned to
 * a fixed range — ratings are open-ended and a run near 1100 would otherwise
 * render as a flat line glued to the top of the box.
 */
function RatingSparkline({ ratings, width }: SparklineProps) {
  const height = 80;
  const padX = 10;
  const padY = 12;

  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = max - min || 1;

  const points = ratings
    .map((r, i) => {
      const x = padX + (i / Math.max(1, ratings.length - 1)) * (width - padX * 2);
      const y = padY + (1 - (r - min) / span) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = padX + (width - padX * 2);
  const lastY = padY + (1 - (ratings[ratings.length - 1] - min) / span) * (height - padY * 2);

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={RED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r={4} fill={RED} />
    </Svg>
  );
}

export function StudentProgressTab({ self }: { self: StudentSelf }) {
  const { width: windowWidth } = useWindowDimensions();
  const { progress, loading, failed } = self;

  const contentWidth = windowWidth - 48;

  const pillars = useMemo(
    () =>
      [...(progress?.latest_pillar_scores ?? [])].sort(
        (a, b) => a.pillar__order - b.pillar__order
      ),
    [progress]
  );

  // Legacy sessions have no rating_after, so they're skipped rather than
  // plotted as zeros — a null there means "not recorded", not "scored 0".
  const ratings = useMemo(
    () =>
      (progress?.history ?? [])
        .map((h) => (h.rating_after != null ? Number(h.rating_after) : null))
        .filter((r): r is number => r != null),
    [progress]
  );

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (failed || !progress) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load your progress.</Text>
      </View>
    );
  }

  const ratingGain =
    ratings.length > 1 ? ratings[ratings.length - 1] - ratings[0] : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <MotiView {...rise(0)} style={styles.header}>
        <Text style={styles.eyebrow}>Current pillars</Text>
        <Text style={styles.title}>My progress</Text>
      </MotiView>

      {pillars.length === 0 ? (
        <MotiView {...rise(60)} style={styles.emptyCard}>
          <Text style={styles.emptyLabel}>NO PILLAR SCORES YET</Text>
          <Text style={styles.emptyBody}>
            Your five pillar standings appear here once a coach has scored your first assessment.
          </Text>
        </MotiView>
      ) : (
        pillars.map((p: PillarScoreEntry, i: number) => {
          // Sessions predating the points rework have no standing_after but do
          // carry the legacy absolute `score` on the same 0-100 scale, so the
          // bars still render for students assessed before the change.
          const standing = num(p.standing_after) ?? num(p.score);
          const delta = num(p.delta);
          const pct = standing != null ? Math.max(0, Math.min(1, standing / MAX_STANDING)) : 0;
          const barWidth = Math.round(pct * (contentWidth - 28));

          return (
            <MotiView
              {...slam(60 + i * 60)}
              key={p.pillar__name}
              style={[
                styles.pillarCard,
                delta != null && delta < 0 ? styles.pillarCardDown : null,
              ]}
            >
              <View style={styles.pillarTopRow}>
                <View style={{ width: contentWidth - 28 - 86 }}>
                  <Text style={styles.pillarName} numberOfLines={1}>
                    {p.pillar__name}
                  </Text>
                </View>
                <View style={styles.pillarValues}>
                  <Text style={styles.pillarScore}>
                    {standing != null ? standing.toFixed(1) : '—'}
                  </Text>
                  <Text style={[styles.pillarTrend, { color: trendColor(delta) }]} numberOfLines={1}>
                    {formatTrend(delta)}
                  </Text>
                </View>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: barWidth }]} />
              </View>
            </MotiView>
          );
        })
      )}

      {ratings.length > 1 ? (
        <MotiView {...rise(60 + pillars.length * 60)} style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>
              RATING · {ratings.length} SESSION{ratings.length === 1 ? '' : 'S'}
            </Text>
            {ratingGain != null ? (
              <Text style={[styles.chartGain, { color: ratingGain >= 0 ? GAIN : RED }]}>
                {ratingGain >= 0 ? '↑' : '↓'} {Math.abs(Math.round(ratingGain))}
              </Text>
            ) : null}
          </View>
          <RatingSparkline ratings={ratings} width={contentWidth - 32} />
          <View style={styles.chartFooter}>
            <Text style={styles.chartBound}>{Math.round(Math.min(...ratings))}</Text>
            <Text style={styles.chartBound}>{Math.round(Math.max(...ratings))}</Text>
          </View>
        </MotiView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: MUTED },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 10 },

  header: { gap: 3, marginBottom: 6, paddingRight: SIGN_OUT_CLEARANCE },
  eyebrow: { fontFamily: fonts.body, fontSize: 12.5, color: MUTED },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },

  pillarCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  pillarCardDown: { borderColor: 'rgba(225,25,25,.25)' },
  pillarTopRow: { flexDirection: 'row', alignItems: 'baseline' },
  pillarName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },
  pillarValues: { width: 86, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' },
  pillarScore: { fontFamily: fonts.monoMedium, fontSize: 16, color: '#F5F5F5' },
  pillarTrend: { fontFamily: fonts.mono, fontSize: 12, marginLeft: 8 },

  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.07)', overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: RED },

  chartCard: {
    marginTop: 6,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chartLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: MUTED },
  chartGain: { fontFamily: fonts.monoMedium, fontSize: 13 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  chartBound: { fontFamily: fonts.mono, fontSize: 10, color: '#5d6669' },

  emptyCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  emptyLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4, color: MUTED },
  emptyBody: { fontFamily: fonts.body, fontSize: 13.5, color: '#F5F5F5', lineHeight: 20 },
});
