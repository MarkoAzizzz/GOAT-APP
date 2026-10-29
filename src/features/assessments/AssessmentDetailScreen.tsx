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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import {
  getAssessment,
  AssessmentDetail,
  AssessmentPillarScore,
  AssessmentCriterionScore,
} from './assessmentsService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

const GAIN = '#34d399';
const LOSS = '#E11919';
const STEADY = '#60a5fa';
const UNKNOWN = '#5C6266';

/**
 * Pillar standings are an aggregate of their criteria, not a criterion score:
 * the observed range is roughly 0-100, while a single criterion is 0-10.
 * Drawing against 10 pegged every vertex to the outer ring.
 */
const MAX_STANDING = 100;

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 18 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 320, delay, easing: RISE_EASING },
  };
}

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase();
}

function num(value: string | null): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * A null delta means the session predates the points system — no change was
 * recorded, which is different from a recorded 0 ("assessed, held steady").
 * Rendering null as "0" would claim the student didn't move when we simply
 * don't know.
 */
function formatDelta(value: number | null): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return rounded > 0 ? `+${text}` : text;
}

function deltaColor(value: number | null): string {
  if (value == null) return UNKNOWN;
  if (value > 0) return GAIN;
  if (value < 0) return LOSS;
  return STEADY;
}

/** 3-letter pillar codes, matching the scoring screen's step bar. */
const PILLAR_CODES: Record<string, string> = {
  'Cardio, Strength & Conditioning': 'CSC',
  'Technical Skills': 'TEC',
  'Sparring & Application': 'SPR',
  'Mental Attributes': 'MEN',
  'Discipline & Habits': 'DIS',
};

function pillarCode(name: string) {
  return PILLAR_CODES[name] ?? name.slice(0, 3).toUpperCase();
}

type RadarProps = {
  size: number;
  pillars: AssessmentPillarScore[];
};

/**
 * Pentagon of the five pillars' standings — the student's *shape*, which a
 * column of numbers can't show. Each vertex is dotted by that pillar's
 * direction this session, so balance and momentum read together.
 */
function PillarRadar({ size, pillars }: RadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  // Labels sit at 1.17x the radius, so the chart has to leave room for them
  // inside the SVG box — too small a margin clips the top label's ascender.
  const radius = size / 2 - 34;
  const count = pillars.length;

  const pointAt = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      x: cx + radius * ratio * Math.cos(angle),
      y: cy + radius * ratio * Math.sin(angle),
    };
  };

  const ring = (ratio: number) =>
    pillars
      .map((_, i) => {
        const p = pointAt(i, ratio);
        return `${p.x},${p.y}`;
      })
      .join(' ');

  const shape = pillars
    .map((p, i) => {
      const standing = num(p.standing_after) ?? 0;
      const point = pointAt(i, Math.max(0.08, Math.min(1, standing / MAX_STANDING)));
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <Svg width={size} height={size}>
      <Polygon points={ring(1)} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={1} />
      <Polygon points={ring(0.66)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={1} />
      <Polygon points={ring(0.33)} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={1} />
      {pillars.map((p, i) => {
        const outer = pointAt(i, 1);
        return (
          <Line
            key={`axis-${p.pillar_name}`}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,.06)"
            strokeWidth={1}
          />
        );
      })}

      <Polygon points={shape} fill="rgba(225,25,25,.22)" stroke={LOSS} strokeWidth={2} />

      {pillars.map((p, i) => {
        const standing = num(p.standing_after) ?? 0;
        const point = pointAt(i, Math.max(0.08, Math.min(1, standing / MAX_STANDING)));
        const label = pointAt(i, 1.17);
        return (
          <React.Fragment key={`v-${p.pillar_name}`}>
            <Circle cx={point.x} cy={point.y} r={3.5} fill={deltaColor(num(p.delta))} />
            <SvgText
              x={label.x}
              y={label.y + 3}
              fill="#9BA3A7"
              fontSize={9}
              textAnchor="middle"
            >
              {pillarCode(p.pillar_name)}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

type AssessmentDetailScreenProps = {
  assessmentId: string;
  onBack: () => void;
};

/**
 * Read-only record of one past assessment, styled as a fight card: the
 * rating move headlines, a radar shows the resulting shape, then each
 * pillar's swing. Tapping a pillar reveals its criteria — every one of
 * them, zeros included, since a 0 is a real result here, not a gap.
 */
export function AssessmentDetailScreen({ assessmentId, onBack }: AssessmentDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { accessToken } = useAuth();

  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openPillar, setOpenPillar] = useState<string | null>(null);

  // Widths come from the window, not onLayout: these rows sit in a
  // ScrollView whose children don't re-render when a parent's measurement
  // lands. `scrollContent` has 24px horizontal padding.
  const contentWidth = windowWidth - 48;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setFailed(false);
    getAssessment(accessToken, assessmentId)
      .then(setDetail)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [accessToken, assessmentId]);

  const criteriaByPillar = useMemo(() => {
    const map = new Map<string, AssessmentCriterionScore[]>();
    for (const c of detail?.criterion_scores ?? []) {
      const list = map.get(c.pillar_name);
      if (list) list.push(c);
      else map.set(c.pillar_name, [c]);
    }
    for (const list of map.values()) list.sort((a, b) => a.criterion_order - b.criterion_order);
    return map;
  }, [detail]);

  const pillars = useMemo(
    () => [...(detail?.pillar_scores ?? [])].sort((a, b) => a.pillar_order - b.pillar_order),
    [detail]
  );

  // Bars are scaled against the session's own biggest swing, so a quiet
  // session still reads rather than rendering five near-invisible slivers.
  const maxSwing = useMemo(() => {
    const swings = pillars.map((p) => Math.abs(num(p.delta) ?? 0));
    return Math.max(1, ...swings);
  }, [pillars]);

  const hasStandings = pillars.some((p) => num(p.standing_after) != null);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.backLabel} numberOfLines={1}>
          ‹ {detail ? detail.student_name : 'Back'}
        </Text>
      </Pressable>
      {detail ? <Text style={styles.headerMeta}>{detail.student_id}</Text> : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centerFill}>
          <ActivityIndicator color={LOSS} />
        </View>
      </View>
    );
  }

  if (failed || !detail) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load this assessment.</Text>
        </View>
      </View>
    );
  }

  const ratingBefore = num(detail.rating_before);
  const ratingAfter = num(detail.rating_after);
  // Legacy sessions store no net_delta but do store both ratings — deriving
  // the change beats showing a dash on a session that visibly moved.
  const storedDelta = num(detail.net_delta);
  const netDelta =
    storedDelta ?? (ratingBefore != null && ratingAfter != null ? ratingAfter - ratingBefore : null);

  const radarSize = Math.min(contentWidth, 280);

  return (
    <View style={styles.root}>
      {header}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MotiView {...rise(0)} style={styles.fightCard}>
          <Text style={styles.round}>
            {detail.sessions_completed > 0
              ? `ROUND ${String(detail.sessions_completed).padStart(2, '0')}`
              : 'ASSESSMENT'}
          </Text>
          <Text style={styles.date}>{formatDate(detail.assessment_date)}</Text>

          <View style={styles.moveRow}>
            <View style={{ width: 64 }}>
              <Text style={styles.moveLabel}>FROM</Text>
              <Text style={styles.moveFrom}>
                {ratingBefore != null ? ratingBefore.toFixed(0) : '—'}
              </Text>
            </View>
            <Text style={styles.moveArrow}>▶</Text>
            <View style={{ width: 92, marginLeft: 10 }}>
              <Text style={styles.moveLabel}>TO</Text>
              <Text style={styles.moveTo}>
                {ratingAfter != null ? ratingAfter.toFixed(0) : '—'}
              </Text>
            </View>
            {netDelta != null ? (
              <View
                style={[
                  styles.netChip,
                  { backgroundColor: netDelta >= 0 ? GAIN : LOSS },
                ]}
              >
                <Text style={[styles.netChipText, { color: netDelta >= 0 ? '#04140E' : '#FFFFFF' }]}>
                  {formatDelta(netDelta)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.metaLine}>
            {detail.sessions_completed} session{detail.sessions_completed === 1 ? '' : 's'} ·{' '}
            {detail.martial_art}
          </Text>
        </MotiView>

        {hasStandings ? (
          <MotiView {...rise(60)} style={styles.radarCard}>
            <Text style={styles.cardLabel}>SHAPE AFTER THIS SESSION</Text>
            <View style={{ alignItems: 'center' }}>
              <PillarRadar size={radarSize} pillars={pillars} />
            </View>
            <View style={styles.legendRow}>
              <Text style={[styles.legendItem, { color: GAIN }]}>● up</Text>
              <Text style={[styles.legendItem, { color: STEADY }]}>● held</Text>
              <Text style={[styles.legendItem, { color: LOSS }]}>● down</Text>
            </View>
          </MotiView>
        ) : null}

        <MotiView {...rise(100)} style={{ gap: 2 }}>
          <Text style={styles.sectionTitle}>Pillars</Text>
          {pillars.map((p, i) => {
            const pillarDelta = num(p.delta);
            const isOpen = openPillar === p.pillar_name;
            const criteria = criteriaByPillar.get(p.pillar_name) ?? [];
            const standingAfter = num(p.standing_after);
            const color = deltaColor(pillarDelta);
            const barWidth = Math.round((Math.abs(pillarDelta ?? 0) / maxSwing) * 46);
            const nameWidth = contentWidth - 24 - 88;

            return (
              <Pressable
                key={p.pillar_name}
                onPress={() => setOpenPillar(isOpen ? null : p.pillar_name)}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                style={styles.pillarRow}
              >
                <View style={styles.pillarTopRow}>
                  <Text style={styles.pillarIndex}>{String(i + 1).padStart(2, '0')}</Text>
                  <View style={{ width: nameWidth, marginLeft: 8 }}>
                    <Text style={styles.pillarName} numberOfLines={1}>{p.pillar_name}</Text>
                    {standingAfter != null ? (
                      <Text style={styles.pillarStanding}>
                        {pillarDelta === 0 ? 'held at ' : 'now '}
                        {standingAfter.toFixed(1)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.pillarRight}>
                    <View style={[styles.swingBar, { width: Math.max(4, barWidth), backgroundColor: color }]} />
                    <Text style={[styles.pillarDelta, { color }]} numberOfLines={1}>
                      {formatDelta(pillarDelta)}
                    </Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.criteriaList}>
                    {criteria.map((c) => {
                      const d = num(c.delta);
                      return (
                        <View key={c.id} style={styles.criterionRow}>
                          <View style={{ width: contentWidth - 24 - 24 - 46 }}>
                            <Text
                              style={[styles.criterionName, d == null && { color: UNKNOWN }]}
                              numberOfLines={1}
                            >
                              {c.criterion_name}
                            </Text>
                            {c.coach_comment ? (
                              <Text style={styles.criterionComment} numberOfLines={2}>
                                {c.coach_comment}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ width: 46, alignItems: 'flex-end' }}>
                            <Text style={[styles.criterionDelta, { color: deltaColor(d) }]}>
                              {formatDelta(d)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            );
          })}
        </MotiView>

        {detail.coach_notes ? (
          <MotiView {...rise(360)} style={styles.noteCard}>
            <Text style={styles.cardLabel}>COACH NOTES</Text>
            <Text style={styles.noteBody}>{detail.coach_notes}</Text>
          </MotiView>
        ) : null}

        {detail.action_plan ? (
          <MotiView {...rise(400)} style={styles.noteCard}>
            <Text style={styles.cardLabel}>ACTION PLAN</Text>
            <Text style={styles.noteBody}>{detail.action_plan}</Text>
          </MotiView>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  headerMeta: { fontFamily: fonts.mono, fontSize: 12, color: UNKNOWN },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48, gap: 18 },

  fightCard: { borderTopWidth: 2, borderTopColor: LOSS, paddingTop: 12 },
  round: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 2.5, color: LOSS },
  date: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: '#F5F5F5', marginTop: 2 },
  moveRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  moveLabel: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.6, color: UNKNOWN },
  moveFrom: { fontFamily: fonts.mono, fontSize: 20, color: UNKNOWN },
  moveArrow: { fontFamily: fonts.body, fontSize: 13, color: LOSS, marginBottom: 5 },
  moveTo: { fontFamily: fonts.monoMedium, fontSize: 34, color: '#F5F5F5', lineHeight: 36 },
  netChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 3, marginBottom: 6 },
  netChipText: { fontFamily: fonts.monoMedium, fontSize: 13 },
  metaLine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#9BA3A7',
    marginTop: 8,
    textTransform: 'capitalize',
  },

  radarCard: {
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  cardLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#9BA3A7',
    textAlign: 'center',
  },
  legendRow: { flexDirection: 'row', justifyContent: 'center' },
  legendItem: { fontFamily: fonts.mono, fontSize: 9, marginHorizontal: 7 },

  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: '#F5F5F5', marginBottom: 6 },
  pillarRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.08)',
  },
  pillarTopRow: { flexDirection: 'row', alignItems: 'center' },
  pillarIndex: { fontFamily: fonts.mono, fontSize: 9, color: UNKNOWN, width: 16 },
  pillarName: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: '#F5F5F5' },
  pillarStanding: { fontFamily: fonts.mono, fontSize: 10, color: UNKNOWN, marginTop: 2 },
  pillarRight: { width: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  swingBar: { height: 3, borderRadius: 2, marginRight: 8 },
  pillarDelta: { fontFamily: fonts.monoMedium, fontSize: 14, width: 30, textAlign: 'right' },

  criteriaList: {
    marginTop: 11,
    paddingTop: 11,
    paddingLeft: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.06)',
    gap: 9,
  },
  criterionRow: { flexDirection: 'row', alignItems: 'center' },
  criterionName: { fontFamily: fonts.body, fontSize: 12.5, color: '#F5F5F5' },
  criterionComment: { fontFamily: fonts.body, fontSize: 11, color: UNKNOWN, marginTop: 2 },
  criterionDelta: { fontFamily: fonts.mono, fontSize: 13 },

  noteCard: {
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  noteBody: { fontFamily: fonts.body, fontSize: 13, color: '#CFD4D7', lineHeight: 19 },
});
