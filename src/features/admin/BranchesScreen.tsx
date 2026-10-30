import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { getBranches, createBranch, getStudents, Branch, Student } from '../students/studentsService';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const MUTED = '#9BA3A7';

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 18 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 320, delay, easing: RISE_EASING },
  };
}

type BranchStats = Branch & { total: number; boxing: number; kickboxing: number };

export function BranchesScreen({ onBack }: { onBack: () => void }) {
  const { accessToken } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([getBranches(accessToken), getStudents(accessToken)])
      .then(([b, s]) => {
        setBranches(b);
        setStudents(s);
      })
      .catch(() => {
        setBranches([]);
        setStudents([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [accessToken]);

  // Counts are derived from the roster rather than stored on Branch, so
  // they're never stale — a student moved between branches just changes
  // which card they're counted under on the next load.
  const stats: BranchStats[] = useMemo(
    () =>
      branches.map((b) => {
        const members = students.filter((s) => s.branch === b.id && s.is_active);
        return {
          ...b,
          total: members.length,
          boxing: members.filter((s) => s.sport === 'boxing').length,
          kickboxing: members.filter((s) => s.sport === 'kickboxing').length,
        };
      }),
    [branches, students]
  );

  const handleAdd = async () => {
    if (!accessToken || submitting) return;
    if (!name.trim() || !location.trim()) {
      setFormError('Fill in both fields.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createBranch(accessToken, { name: name.trim(), location: location.trim() });
      setName('');
      setLocation('');
      setShowAddForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setShowAddForm((v) => !v);
            setFormError('');
          }}
          hitSlop={12}
        >
          <Text style={styles.addLabel}>{showAddForm ? 'Cancel' : '+ Add branch'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <MotiView {...rise(0)}>
          <Text style={styles.title}>Branches</Text>
          <Text style={styles.subtitle}>
            {branches.length} location{branches.length === 1 ? '' : 's'}
          </Text>
        </MotiView>

        {showAddForm ? (
          <MotiView {...rise(40)} style={styles.formCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Branch name"
              placeholderTextColor="#5C6266"
              style={styles.input}
            />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor="#5C6266"
              style={styles.input}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Pressable onPress={handleAdd} style={styles.submitButton} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#F5F5F5" />
              ) : (
                <Text style={styles.submitLabel}>Add branch</Text>
              )}
            </Pressable>
          </MotiView>
        ) : null}

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={RED} />
          </View>
        ) : (
          stats.map((b, i) => {
            const expanded = expandedId === b.id;
            const members = students.filter((s) => s.branch === b.id && s.is_active);
            return (
              <MotiView {...rise(80 + i * 40)} key={b.id}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : b.id)}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                  style={styles.card}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>{b.name}</Text>
                    <Text style={styles.chevron}>{expanded ? '︿' : '›'}</Text>
                  </View>
                  <Text style={styles.cardLocation}>{b.location || '—'} · {b.total} members</Text>
                  <View style={styles.chipRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{b.boxing} boxing</Text>
                    </View>
                    <View style={[styles.chip, styles.chipMuted]}>
                      <Text style={[styles.chipText, styles.chipTextMuted]}>{b.kickboxing} kickboxing</Text>
                    </View>
                  </View>

                  {expanded ? (
                    <View style={styles.memberList}>
                      {members.length === 0 ? (
                        <Text style={styles.emptyText}>No active members yet.</Text>
                      ) : (
                        members.map((m) => (
                          <Text key={m.id} style={styles.memberRow} numberOfLines={1}>
                            {m.full_name} · {m.student_id}
                          </Text>
                        ))
                      )}
                    </View>
                  ) : null}
                </Pressable>
              </MotiView>
            );
          })
        )}
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
    paddingTop: 16,
    paddingBottom: 8,
    paddingRight: 24 + SIGN_OUT_CLEARANCE,
  },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  addLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: RED },
  centerFill: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 6 },

  formCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
    backgroundColor: '#101010',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 15,
  },
  errorText: { fontFamily: fonts.body, fontSize: 12.5, color: '#f04a4a' },
  submitButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },

  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5', flex: 1, marginRight: 8 },
  chevron: { fontFamily: fonts.mono, fontSize: 14, color: MUTED },
  cardLocation: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  chip: {
    backgroundColor: 'rgba(225,25,25,.1)',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,.3)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipMuted: { backgroundColor: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.12)' },
  chipText: { fontFamily: fonts.mono, fontSize: 9.5, color: RED },
  chipTextMuted: { color: MUTED },

  memberList: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.07)',
    gap: 6,
  },
  memberRow: { fontFamily: fonts.body, fontSize: 13, color: '#F5F5F5' },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: MUTED },
});
