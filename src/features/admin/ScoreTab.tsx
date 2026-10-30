import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getStudents, getStudent, isAssessedThisMonth, Student } from '../students/studentsService';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';
import {
  getAssessmentTemplate,
  submitCoachEntry,
  getCoachEntries,
  AssessmentTemplate,
} from '../assessments/assessmentsService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Hand-picked for the 5 real seeded pillars so each code reads cleanly
// (e.g. "SPR" not "SPA" for Sparring, which misreads as the word "spa").
// Falls back to the first 3 letters of the first word for anything else,
// so a future/renamed pillar still gets a reasonable code instead of
// crashing or showing blank.
const PILLAR_CODES: Record<string, string> = {
  'Cardio, Strength & Conditioning': 'CSC',
  'Technical Skills': 'TEC',
  'Sparring & Application': 'SPR',
  'Mental Attributes': 'MEN',
  'Discipline & Habits': 'DIS',
};

function pillarCode(name: string) {
  return PILLAR_CODES[name] ?? name.split(' ')[0].slice(0, 3).toUpperCase();
}

function clampDelta(v: number) {
  return Math.max(-3, Math.min(3, v));
}

// Untouched criteria still default to displaying "0" (not a blank/dot) —
// the deltas map itself still only holds keys for criteria the coach has
// actually adjusted, so submission/scoredCount logic is unaffected.
function formatDelta(v: number) {
  return v > 0 ? `+${v}` : String(v);
}

function deltaColor(v: number | undefined) {
  if (v == null) return '#9BA3A7';
  if (v > 0) return '#10b981';
  if (v < 0) return '#E11919';
  return '#F5F5F5';
}

type Step = 'pick' | 'score' | 'review' | 'success';
export type PickerFilter = 'all' | 'boxing' | 'kickboxing' | 'not_assessed';

const PICKER_FILTERS: { key: PickerFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'boxing', label: 'Boxing' },
  { key: 'kickboxing', label: 'Kickboxing' },
  { key: 'not_assessed', label: 'Not assessed' },
];

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type ScoreTabProps = {
  initialStudentId: string | null;
  initialFilter?: PickerFilter;
  onExitToHome: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

/**
 * Scores post as a CoachEntry: a -3..+3 delta per criterion, applied on the
 * backend on top of that criterion's running standing (its last effective
 * score) rather than an absolute value — matches the live production
 * system's scoring UX. Pillars and criteria are fetched live from
 * /assessments/template/, never hardcoded.
 */
export function ScoreTab({
  initialStudentId,
  initialFilter = 'all',
  onExitToHome,
  onDirtyChange,
}: ScoreTabProps) {
  const { accessToken, user } = useAuth();

  const [step, setStep] = useState<Step>(initialStudentId ? 'score' : 'pick');
  const [student, setStudent] = useState<Student | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState('');
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>(initialFilter);

  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [templateError, setTemplateError] = useState(false);
  const [pillarIndex, setPillarIndex] = useState(0);
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    if (!accessToken || !initialStudentId) return;
    getStudent(accessToken, initialStudentId).then(setStudent).catch(() => setStudent(null));
  }, [accessToken, initialStudentId]);

  useEffect(() => {
    if (!accessToken || step !== 'pick') return;
    setStudentsLoading(true);
    getStudents(accessToken)
      // A deactivated student can't be picked here — they're off the
      // roster, not just hidden from the leaderboard.
      .then((students) => setAllStudents(students.filter((s) => s.is_active)))
      .catch(() => setAllStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [accessToken, step]);

  // CoachEntry is keyed (student, coach, date) — submitting again today would
  // silently overwrite today's entry, so pre-fill from it instead of
  // starting blank and losing whatever was already scored.
  useEffect(() => {
    if (!accessToken || !student) return;
    getCoachEntries(accessToken, student.id, todayISO())
      .then((entries) => {
        const mine = entries.find((e) => e.coach_name === user?.full_name);
        if (!mine) return;
        const deltaMap: Record<string, number> = {};
        const commentMap: Record<string, string> = {};
        mine.scores.forEach((s) => {
          if (s.delta != null) deltaMap[s.criterion_id] = Number(s.delta);
          if (s.comment) commentMap[s.criterion_id] = s.comment;
        });
        setDeltas(deltaMap);
        setComments(commentMap);
        setNotes(mine.notes ?? '');
        setActionPlan(mine.action_plan ?? '');
      })
      .catch(() => {});
  }, [accessToken, student]);

  useEffect(() => {
    if (!accessToken || step === 'pick' || template) return;
    getAssessmentTemplate(accessToken)
      .then(setTemplate)
      .catch(() => setTemplateError(true));
  }, [accessToken, step, template]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (pickerFilter === 'boxing' && s.sport !== 'boxing') return false;
      if (pickerFilter === 'kickboxing' && s.sport !== 'kickboxing') return false;
      if (pickerFilter === 'not_assessed' && isAssessedThisMonth(s)) return false;
      if (q && !s.full_name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allStudents, query, pickerFilter]);

  const pillars = template?.pillars ?? [];
  const currentPillar = pillars[pillarIndex];
  const allCriteria = useMemo(() => pillars.flatMap((p) => p.criteria), [pillars]);
  const scoredCount = Object.keys(deltas).length;

  const pillarNet = (pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId);
    if (!pillar) return null;
    const touched = pillar.criteria.map((c) => deltas[c.id]).filter((v): v is number => v != null);
    if (touched.length === 0) return null;
    return touched.reduce((a, b) => a + b, 0);
  };

  const sessionNet = useMemo(() => {
    const touched = Object.values(deltas);
    if (touched.length === 0) return null;
    return touched.reduce((a, b) => a + b, 0);
  }, [deltas]);

  // Simple heuristic, not a diff against the pre-filled baseline: true
  // whenever there's any score/note content while mid-session. A coach who
  // exits right after a pre-fill loaded (nothing changed) sees one harmless
  // extra confirm — cheaper than tracking a full baseline snapshot.
  const isDirty =
    (step === 'score' || step === 'review') &&
    (scoredCount > 0 || notes.trim() !== '' || actionPlan.trim() !== '');

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const adjustDelta = (criterionId: string, direction: 1 | -1) => {
    setDeltas((prev) => {
      const current = prev[criterionId];
      const next = current == null ? direction : clampDelta(current + direction);
      return { ...prev, [criterionId]: next };
    });
  };

  const pickStudent = (s: Student) => {
    setStudent(s);
    setStep('score');
  };

  const goNextPillar = () => {
    if (pillarIndex < pillars.length - 1) {
      setPillarIndex((i) => i + 1);
    } else {
      setStep('review');
    }
  };

  const resetForNewStudent = () => {
    setStep('pick');
    setStudent(null);
    setPillarIndex(0);
    setDeltas({});
    setComments({});
    setNotes('');
    setActionPlan('');
    setSubmitError('');
  };

  const goPrevPillar = () => {
    if (pillarIndex > 0) {
      setPillarIndex((i) => i - 1);
      return;
    }
    const exit = initialStudentId ? onExitToHome : resetForNewStudent;
    if (isDirty) {
      setPendingConfirm({
        title: 'Discard this assessment?',
        message: "Scores you've entered so far will be lost.",
        confirmLabel: 'Discard',
        onConfirm: () => {
          setPendingConfirm(null);
          exit();
        },
      });
    } else {
      exit();
    }
  };

  const handleSubmit = async () => {
    if (!accessToken || !student || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitCoachEntry(accessToken, {
        student: student.id,
        assessment_date: todayISO(),
        sessions_completed: 0,
        notes,
        action_plan: actionPlan,
        // Submit all 25 criteria explicitly (0 for untouched) — the backend
        // treats an explicit 0 as "assessed, no change", not "skipped".
        scores: allCriteria.map((c) => ({
          criterion_id: c.id,
          delta: deltas[c.id] ?? 0,
          comment: comments[c.id] ?? '',
        })),
      });
      setStep('success');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <MotiView {...rise(0)}>
          <Text style={styles.title}>Score</Text>
          <Text style={styles.subtitle}>Pick a student to assess</Text>
        </MotiView>
        <MotiView {...rise(40)}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or id"
            placeholderTextColor="#5C6266"
            style={styles.search}
          />
        </MotiView>
        <MotiView {...rise(70)} style={styles.chipRow}>
          {PICKER_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setPickerFilter(f.key)}
              style={[styles.chip, pickerFilter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, pickerFilter === f.key && styles.chipLabelActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </MotiView>
        {studentsLoading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color="#E11919" />
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 24, paddingTop: 14 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No students match.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pickStudent(item)}
                android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                style={styles.pickRow}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.full_name)}</Text>
                </View>
                <View style={styles.pickIdentity}>
                  <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{item.student_id} · {item.sport}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.container, styles.centerFill]}>
        <MotiView {...rise(0)} style={{ alignItems: 'center', gap: 20 }}>
          <Text style={styles.successTitle}>Assessment submitted</Text>
          <Text style={styles.subtitle}>{student?.full_name}'s score has been recalculated.</Text>
          <Pressable onPress={resetForNewStudent} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Score another student</Text>
          </Pressable>
          <Pressable onPress={onExitToHome} hitSlop={8}>
            <Text style={styles.doneLink}>Done</Text>
          </Pressable>
        </MotiView>
      </View>
    );
  }

  if (!student || templateError || !template) {
    return (
      <View style={[styles.container, styles.centerFill]}>
        {templateError ? (
          <Text style={styles.emptyText}>Couldn't load the scoring rubric.</Text>
        ) : (
          <ActivityIndicator color="#E11919" />
        )}
      </View>
    );
  }

  if (step === 'review') {
    return (
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => setStep('score')} hitSlop={12}>
              <Text style={styles.backLabel} numberOfLines={1}>‹ {student.full_name}</Text>
            </Pressable>
            <Text style={styles.headerMeta}>{student.student_id}</Text>
          </View>
          <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
            <MotiView {...rise(0)} style={{ gap: 4 }}>
              <Text style={styles.title}>Review</Text>
              <Text style={styles.subtitle}>Session net {formatDelta(sessionNet ?? 0)}</Text>
            </MotiView>

            <MotiView {...rise(40)} style={{ gap: 8 }}>
              <Text style={styles.label}>Coach notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Overall notes for this session"
                placeholderTextColor="#5C6266"
                multiline
                style={styles.textArea}
              />
            </MotiView>

            <MotiView {...rise(80)} style={{ gap: 8 }}>
              <Text style={styles.label}>Action plan</Text>
              <TextInput
                value={actionPlan}
                onChangeText={setActionPlan}
                placeholder="What should they work on before next time?"
                placeholderTextColor="#5C6266"
                multiline
                style={styles.textArea}
              />
            </MotiView>

            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

            <Pressable onPress={handleSubmit} style={styles.primaryButton} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#F5F5F5" />
              ) : (
                <Text style={styles.primaryButtonLabel}>Submit assessment</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
        <ConfirmModal
          visible={!!pendingConfirm}
          title={pendingConfirm?.title ?? ''}
          message={pendingConfirm?.message ?? ''}
          confirmLabel={pendingConfirm?.confirmLabel ?? ''}
          onConfirm={() => pendingConfirm?.onConfirm()}
          onCancel={() => setPendingConfirm(null)}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goPrevPillar} hitSlop={12}>
          <Text style={styles.backLabel} numberOfLines={1}>‹ {student.full_name}</Text>
        </Pressable>
        <Text style={styles.headerMeta}>{student.student_id}</Text>
      </View>

      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <MotiView {...rise(0)} style={styles.pillarHeaderRow}>
          <Text style={styles.title} numberOfLines={2}>{currentPillar?.name}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.pillarNetLabel}>PILLAR NET POINTS</Text>
            <Text
              style={[
                styles.pillarNetValue,
                { color: currentPillar ? deltaColor(pillarNet(currentPillar.id) ?? undefined) : '#9BA3A7' },
              ]}
            >
              {currentPillar && pillarNet(currentPillar.id) != null
                ? formatDelta(pillarNet(currentPillar.id) as number)
                : '0.0'}
            </Text>
          </View>
        </MotiView>

        <View style={styles.stepRow}>
          {pillars.map((p, i) => (
            <Pressable key={p.id} onPress={() => setPillarIndex(i)} style={styles.stepColumn}>
              <View
                style={[
                  styles.stepBar,
                  i === pillarIndex && styles.stepBarActive,
                  i < pillarIndex && styles.stepBarDone,
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  i === pillarIndex && styles.stepLabelActive,
                  i < pillarIndex && styles.stepLabelDone,
                ]}
              >
                {pillarCode(p.name)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          {currentPillar?.criteria.map((c, i) => {
            const value = deltas[c.id] ?? 0;
            return (
              <MotiView {...rise(60 + i * 40)} key={c.id} style={styles.criterionCard}>
                <View style={styles.criterionTopRow}>
                  <Text style={styles.criterionNumber}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.criterionName} numberOfLines={2}>{c.name}</Text>
                  <View style={styles.stepperRow}>
                    <Pressable onPress={() => adjustDelta(c.id, -1)} style={styles.stepperButton}>
                      <Text style={styles.stepperButtonLabel}>−</Text>
                    </Pressable>
                    <Text style={[styles.stepperValue, { color: deltaColor(value) }]}>{formatDelta(value)}</Text>
                    <Pressable onPress={() => adjustDelta(c.id, 1)} style={[styles.stepperButton, styles.stepperButtonPlus]}>
                      <Text style={styles.stepperButtonLabel}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  value={comments[c.id] ?? ''}
                  onChangeText={(t) => setComments((prev) => ({ ...prev, [c.id]: t }))}
                  placeholder="Note"
                  placeholderTextColor="#5C6266"
                  style={styles.criterionNote}
                />
              </MotiView>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ gap: 1 }}>
          <Text style={styles.sessionLabel}>SESSION NET</Text>
          <Text style={[styles.sessionValue, { color: deltaColor(sessionNet ?? undefined) }]}>
            {sessionNet != null ? formatDelta(sessionNet) : '0.0'}
          </Text>
        </View>
        <Pressable onPress={goNextPillar} style={styles.primaryButtonFlex}>
          <Text style={styles.primaryButtonLabel} numberOfLines={1}>
            {pillarIndex < pillars.length - 1 ? `Next: ${pillars[pillarIndex + 1].name}` : 'Review & submit'}
          </Text>
        </Pressable>
      </View>
      </View>
      <ConfirmModal
        visible={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? ''}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 14 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7' },
  successTitle: { fontFamily: fonts.displayBold, fontSize: 26, color: '#F5F5F5', textAlign: 'center' },
  search: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
    backgroundColor: '#101010',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 15,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7', textAlign: 'center', marginTop: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: '#E11919', borderColor: '#E11919' },
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#9BA3A7' },
  chipLabelActive: { color: '#F5F5F5' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 13,
    overflow: 'hidden',
  },
  pickIdentity: { flex: 1, gap: 2, marginLeft: 14 },
  avatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: '#9BA3A7' },
  // paddingRight keeps the student id clear of the shell's sign-out corner.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingRight: SIGN_OUT_CLEARANCE,
  },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7', maxWidth: 240 },
  headerMeta: { fontFamily: fonts.mono, fontSize: 12, color: '#9BA3A7' },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: '#9BA3A7',
    textTransform: 'uppercase',
  },
  textArea: {
    minHeight: 90,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
    backgroundColor: '#101010',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: '#f04a4a', textAlign: 'center' },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryButtonFlex: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  doneLink: { fontFamily: fonts.displayBold, fontSize: 12, letterSpacing: 1.6, color: '#9BA3A7', textTransform: 'uppercase' },
  pillarHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  pillarNetLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: '#9BA3A7' },
  pillarNetValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: '#E11919' },
  stepRow: { flexDirection: 'row', width: '100%' },
  stepColumn: { flex: 1, alignItems: 'center', gap: 6 },
  stepBar: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,.12)',
  },
  stepBarActive: { backgroundColor: '#E11919', transform: [{ scaleY: 1.3 }] },
  stepBarDone: { backgroundColor: 'rgba(225,25,25,.45)' },
  stepLabel: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.4, color: '#5C6266' },
  stepLabelActive: { color: '#E11919' },
  stepLabelDone: { color: '#9BA3A7' },
  criterionCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  criterionTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  criterionNumber: { fontFamily: fonts.mono, fontSize: 11, color: '#9BA3A7' },
  criterionName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14.5, color: '#F5F5F5', minWidth: 0 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonPlus: { borderWidth: 0, backgroundColor: '#E11919' },
  stepperButtonLabel: { fontFamily: fonts.mono, fontSize: 18, color: '#F5F5F5' },
  stepperValue: { width: 36, textAlign: 'center', fontFamily: fonts.monoMedium, fontSize: 17, color: '#F5F5F5' },
  criterionNote: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    backgroundColor: '#0F0F0F',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.08)',
  },
  sessionLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: '#9BA3A7' },
  sessionValue: { fontFamily: fonts.monoMedium, fontSize: 19, color: '#F5F5F5' },
});
