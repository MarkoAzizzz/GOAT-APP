import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getStudent, getStudentProgress, Student, StudentProgress } from './studentsService';
import { AssessmentDetailScreen } from '../assessments/AssessmentDetailScreen';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

// The timeline rail is a sibling View, not the card's borderLeft: Android
// drops a single-sided border entirely when borderRadius is also set, so
// the rail silently never painted.
const HISTORY_RAIL_WIDTH = 3;
const HISTORY_RAIL_GAP = 9;

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 18 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 320, delay, easing: RISE_EASING },
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ScoreSparkline({ history }: { history: StudentProgress['history'] }) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 48 - 40;
  const chartHeight = 72;

  // Ratings are open-ended, so the scale is derived from the data rather than
  // pinned to 0-100 — a flat run near 1000 would otherwise render as a
  // straight line hugging the top of the chart.
  const points = [...history]
    .reverse()
    .filter((h) => h.rating_after != null)
    .map((h) => Number(h.rating_after));
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = chartWidth / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = chartHeight - ((p - min) / range) * chartHeight;
    return { x, y };
  });

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Polyline
        points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
        fill="none"
        stroke="#E11919"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <Circle key={i} cx={c.x} cy={c.y} r={3} fill="#E11919" />
      ))}
    </Svg>
  );
}

type StudentProfileScreenProps = {
  studentId: string;
  onBack: () => void;
  onNewAssessment: (studentId: string) => void;
};

export function StudentProfileScreen({ studentId, onBack, onNewAssessment }: StudentProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [error, setError] = useState(false);

  /**
   * Row widths are derived from the window instead of measured with
   * onLayout: the measurement lands a frame late and doesn't reliably reach
   * children on Android, which collapsed these columns to zero width.
   * `scrollContent` has 24px horizontal padding.
   */
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - 48;
  const STAT_GAP = 12;
  const statCardWidth = (contentWidth - STAT_GAP * 2) / 3;
  // Opening an assessment is kept here rather than in AdminShell so that
  // backing out of it returns to this profile, scroll position intact.
  const [openAssessmentId, setOpenAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setStudent(null);
    setProgress(null);
    setError(false);
    Promise.all([getStudent(accessToken, studentId), getStudentProgress(accessToken, studentId)])
      .then(([s, p]) => {
        setStudent(s);
        setProgress(p);
      })
      .catch(() => setError(true));
  }, [accessToken, studentId]);

  const history = progress?.history ? [...progress.history].reverse() : [];
  const rating = progress?.current_rating ?? (student ? parseFloat(student.rating) : null);
  const ratingChange = progress?.rating_change ?? null;

  if (openAssessmentId) {
    return (
      <AssessmentDetailScreen
        assessmentId={openAssessmentId}
        onBack={() => setOpenAssessmentId(null)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        {student && (
          <Pressable onPress={() => onNewAssessment(studentId)} style={styles.newAssessmentButton}>
            <Text style={styles.newAssessmentLabel}>+ New assessment</Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load this student.</Text>
        </View>
      ) : !student || !progress ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#E11919" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MotiView {...rise(0)} style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(student.full_name)}</Text>
              </View>
              <View style={{ width: contentWidth - 40 - 56 - 14, gap: 2, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.name} numberOfLines={1}>{student.full_name}</Text>
                </View>
                <Text style={styles.studentCode}>{student.student_id}</Text>
                <Text style={styles.email} numberOfLines={1}>{student.email}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>{student.sport}</Text>
              </View>
              <View style={[styles.badge, { borderColor: 'rgba(225,25,25,0.4)', backgroundColor: 'rgba(225,25,25,0.1)' }]}>
                <Text style={[styles.badgeLabel, { color: '#E11919' }]}>
                  {rating === null ? '—' : `${rating.toFixed(0)} pts`}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  student.is_active
                    ? { borderColor: 'rgba(52,211,153,0.4)', backgroundColor: 'rgba(52,211,153,0.1)' }
                    : { borderColor: 'rgba(225,25,25,0.4)', backgroundColor: 'rgba(225,25,25,0.1)' },
                ]}
              >
                <Text style={[styles.badgeLabel, { color: student.is_active ? '#34d399' : '#E11919' }]}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreLabel}>RATING</Text>
                <Text style={styles.scoreValue}>
                  {progress.current_rating != null ? progress.current_rating.toFixed(0) : '—'}
                </Text>
              </View>
              <View>
                <Text style={styles.scoreLabel}>LAST CHANGE</Text>
                <Text
                  style={[
                    styles.scoreValueSmall,
                    { color: (ratingChange ?? 0) >= 0 ? '#34d399' : '#E11919' },
                  ]}
                >
                  {ratingChange != null ? `${ratingChange > 0 ? '+' : ''}${ratingChange.toFixed(0)}` : '—'}
                </Text>
              </View>
            </View>
          </MotiView>

          <MotiView {...rise(80)} style={styles.statRow}>
            <View style={[styles.statCard, { width: statCardWidth }]}>
              <Text style={styles.statValue}>{progress.total_assessments}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Assessments</Text>
            </View>
            <View style={[styles.statCard, { width: statCardWidth, marginLeft: STAT_GAP }]}>
              <Text style={styles.statValue}>
                {progress.highest_rating != null ? progress.highest_rating.toFixed(0) : '—'}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Peak</Text>
            </View>
            <View style={[styles.statCard, { width: statCardWidth, marginLeft: STAT_GAP }]}>
              <Text style={[styles.statValue, { color: (ratingChange ?? 0) >= 0 ? '#34d399' : '#E11919' }]}>
                {ratingChange != null ? `${ratingChange > 0 ? '+' : ''}${ratingChange.toFixed(0)}` : '—'}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Change</Text>
            </View>
          </MotiView>

          {history.length > 1 && (
            <MotiView {...rise(140)} style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Rating history</Text>
              <ScoreSparkline history={progress.history} />
            </MotiView>
          )}

          <MotiView {...rise(180)} style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Assessment history</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No assessments yet.</Text>
            ) : (
              history.map((h, i) => {
                // `history` is newest-first, so index 0 is the latest session —
                // its rail burns full red and fades for older entries.
                const isLatest = i === 0;
                const RIGHT_WIDTH = 92;
                const cardWidth = contentWidth - HISTORY_RAIL_WIDTH - HISTORY_RAIL_GAP;
                const innerWidth = cardWidth - 24;
                const leftWidth = innerWidth - RIGHT_WIDTH - 10;
                const delta = h.net_delta != null ? Number(h.net_delta) : null;
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => setOpenAssessmentId(h.id)}
                    style={({ pressed }) => [styles.historyRow, pressed && { opacity: 0.7 }]}
                  >
                    <View
                      style={[
                        styles.historyRail,
                        { backgroundColor: isLatest ? '#E11919' : 'rgba(225,25,25,0.35)' },
                      ]}
                    />
                    <View
                      style={[
                        styles.historyCard,
                        { width: cardWidth },
                        isLatest && styles.historyCardLatest,
                      ]}
                    >
                    <View style={styles.historyLine}>
                      <View style={{ width: leftWidth, marginRight: 10 }}>
                        <Text style={styles.historyDate} numberOfLines={1}>
                          {formatDate(h.assessment_date)}
                        </Text>
                      </View>
                      <View style={{ width: RIGHT_WIDTH, alignItems: 'flex-end' }}>
                        {delta != null ? (
                          <Text
                            style={[styles.historyDelta, { color: delta >= 0 ? '#34d399' : '#E11919' }]}
                            numberOfLines={1}
                          >
                            {delta > 0 ? '+' : ''}{delta.toFixed(0)}
                          </Text>
                        ) : (
                          <Text style={[styles.historyDelta, { color: '#5C6266' }]} numberOfLines={1}>
                            legacy
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.historyLine, { marginTop: 4 }]}>
                      <View style={{ width: leftWidth, marginRight: 10 }}>
                        <Text style={styles.historyNote} numberOfLines={1}>
                          {h.coach_notes ? h.coach_notes : `${h.sessions_completed ?? 0} sessions`}
                        </Text>
                      </View>
                      <View style={{ width: RIGHT_WIDTH, alignItems: 'flex-end' }}>
                        <Text style={styles.historyGrade} numberOfLines={1}>
                          {h.rating_after != null ? Number(h.rating_after).toFixed(0) : '—'}
                        </Text>
                      </View>
                    </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </MotiView>
        </ScrollView>
      )}
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: { alignSelf: 'flex-start' },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  newAssessmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E11919',
  },
  newAssessmentLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#F5F5F5' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48, gap: 20 },
  heroCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,0.15)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(225,25,25,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 20, color: '#E11919' },
  name: { fontFamily: fonts.displayBold, fontSize: 22, color: '#F5F5F5' },
  studentCode: { fontFamily: fonts.mono, fontSize: 12, color: '#E11919' },
  email: { fontFamily: fonts.body, fontSize: 12, color: '#9BA3A7' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: '#F5F5F5', textTransform: 'capitalize' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },
  scoreLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: '#9BA3A7', marginBottom: 4 },
  scoreValue: { fontFamily: fonts.displayBold, fontSize: 30, color: '#E11919' },
  scoreValueSmall: { fontFamily: fonts.displayBold, fontSize: 24 },
  // No `gap` and no `flex: 1` here on purpose: that combination collapses
  // row children on Android. Widths are set explicitly at the call site.
  statRow: { flexDirection: 'row' },
  statCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 18, color: '#F5F5F5' },
  statLabel: { fontFamily: fonts.mono, fontSize: 10, color: '#9BA3A7', textTransform: 'uppercase', letterSpacing: 1 },
  chartCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: '#F5F5F5' },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7' },
  // alignItems:'stretch' is what gives the rail its height — it has no
  // height of its own and takes the row's, which the card sibling sets.
  historyRow: { flexDirection: 'row', alignItems: 'stretch' },
  historyRail: {
    width: HISTORY_RAIL_WIDTH,
    borderRadius: 2,
    marginRight: HISTORY_RAIL_GAP,
  },
  historyCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  // The newest assessment carries the accent; older ones stay neutral so
  // the most recent result reads as the headline.
  historyCardLatest: {
    backgroundColor: '#241111',
    borderColor: 'rgba(225,25,25,0.4)',
  },
  historyLine: { flexDirection: 'row', alignItems: 'baseline' },
  historyDate: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: '#F5F5F5' },
  historyNote: { fontFamily: fonts.body, fontSize: 11.5, color: '#9BA3A7' },
  historyDelta: { fontFamily: fonts.mono, fontSize: 12 },
  historyGrade: { fontFamily: fonts.monoMedium, fontSize: 19, color: '#F5F5F5' },
});
