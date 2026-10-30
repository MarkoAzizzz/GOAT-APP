import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { getStudents, getBranches, Student, Branch } from '../students/studentsService';
import { AddStudentForm } from '../students/AddStudentForm';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

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

type FilterKey = 'all' | 'boxing' | 'kickboxing' | 'inactive';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'boxing', label: 'Boxing' },
  { key: 'kickboxing', label: 'Kickboxing' },
  { key: 'inactive', label: 'Inactive' },
];

type TeamTabProps = {
  onSelectStudent: (studentId: string) => void;
};

/**
 * Roster is fetched once and filtered/searched client-side — the real
 * roster is small (per the design brief, "under 30 students, so one flat
 * list"), so there's no need to round-trip to the API per keystroke.
 * Each row shows the student's open-ended rating and active status — the
 * design's "Scored Xd ago" isn't on the Student serializer.
 */
export function TeamTab({ onSelectStudent }: TeamTabProps) {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const loadStudents = () => {
    if (!accessToken) return;
    setLoading(true);
    getStudents(accessToken)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadStudents, [accessToken]);

  // Re-fetched every time this tab mounts (AdminShell remounts tabs fresh on
  // each navigation), so a branch added from More > Branches shows up here
  // without any extra wiring between the two screens.
  useEffect(() => {
    if (!accessToken) return;
    getBranches(accessToken)
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [accessToken]);

  const activeCount = useMemo(() => students.filter((s) => s.is_active).length, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (filter === 'boxing' && s.sport !== 'boxing') return false;
      if (filter === 'kickboxing' && s.sport !== 'kickboxing') return false;
      if (filter === 'inactive' && s.is_active) return false;
      if (branchFilter !== 'all' && s.branch !== branchFilter) return false;
      if (q && !s.full_name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, query, filter, branchFilter]);

  if (showAddForm) {
    return (
      <AddStudentForm
        onBack={() => setShowAddForm(false)}
        onCreated={() => {
          setShowAddForm(false);
          loadStudents();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MotiView {...rise(0)} style={styles.headerRow}>
        <Text style={styles.title}>Team</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={styles.activeCount}>{activeCount} active</Text>
          <Pressable onPress={() => setShowAddForm(true)} style={styles.addButton} hitSlop={8}>
            <Text style={styles.addButtonLabel}>+</Text>
          </Pressable>
        </View>
      </MotiView>

      <MotiView {...rise(50)}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or id"
          placeholderTextColor="#5C6266"
          style={styles.search}
        />
      </MotiView>

      <MotiView {...rise(90)} style={styles.chipRow}>
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

      {branches.length > 1 ? (
        <MotiView {...rise(110)} style={styles.chipRow}>
          <Pressable
            onPress={() => setBranchFilter('all')}
            style={[styles.chip, branchFilter === 'all' && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, branchFilter === 'all' && styles.chipLabelActive]}>
              All branches
            </Text>
          </Pressable>
          {branches.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBranchFilter(b.id)}
              style={[styles.chip, branchFilter === b.id && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, branchFilter === b.id && styles.chipLabelActive]}>
                {b.name}
              </Text>
            </Pressable>
          ))}
        </MotiView>
      ) : null}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#E11919" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No students match.</Text>}
          renderItem={({ item, index }) => (
            <MotiView {...rise(120 + index * 40)}>
              <Pressable
                onPress={() => onSelectStudent(item.id)}
                android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                style={styles.row}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.full_name)}</Text>
                </View>
                <View style={styles.identity}>
                  <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.student_id} · {item.sport}
                    {branches.length > 1 ? ` · ${item.branch_name}` : ''}
                  </Text>
                </View>
                <View style={styles.rowStats}>
                  <Text style={styles.rating} numberOfLines={1}>
                    {parseFloat(item.rating).toFixed(0)}
                  </Text>
                  <Text style={[styles.status, { color: item.is_active ? '#9BA3A7' : '#E11919' }]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </Pressable>
            </MotiView>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 14 },
  // paddingRight keeps the + button clear of the shell's sign-out corner.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingRight: SIGN_OUT_CLEARANCE,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },
  activeCount: { fontFamily: fonts.mono, fontSize: 12, color: '#9BA3A7' },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: { fontFamily: fonts.displayBold, fontSize: 18, color: '#F5F5F5', lineHeight: 20 },
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
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7', textAlign: 'center', marginTop: 24 },
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
  identity: { flex: 1, gap: 3, marginLeft: 14 },
  rowStats: { alignItems: 'flex-end', gap: 3, marginLeft: 14 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: '#9BA3A7' },
  rating: { fontFamily: fonts.monoMedium, fontSize: 15, color: '#F5F5F5' },
  status: { fontFamily: fonts.body, fontSize: 11 },
});
