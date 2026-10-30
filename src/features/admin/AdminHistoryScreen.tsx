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
import { getStudents, Student } from '../students/studentsService';
import { getStudentPackageHistory, SessionPackage } from '../packages/packagesService';
import { PackageCard, historyCardStyles } from '../packages/PackageHistoryCard';
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function AdminHistoryScreen({ onBack }: { onBack: () => void }) {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [packages, setPackages] = useState<SessionPackage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getStudents(accessToken)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [accessToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
    );
  }, [students, query]);

  const pickStudent = (s: Student) => {
    setSelected(s);
    setPackages(null);
    setFailed(false);
    if (!accessToken) return;
    getStudentPackageHistory(accessToken, s.id)
      .then(setPackages)
      .catch(() => setFailed(true));
  };

  if (selected) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)} hitSlop={12}>
            <Text style={styles.backLabel} numberOfLines={1}>‹ {selected.full_name}</Text>
          </Pressable>
        </View>

        {failed ? (
          <View style={styles.centerFill}>
            <Text style={styles.emptyText}>Couldn't load this student's history.</Text>
          </View>
        ) : packages === null ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={RED} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <MotiView {...rise(0)}>
              <Text style={styles.title} numberOfLines={1}>{selected.full_name}</Text>
              <Text style={styles.subtitle}>
                {selected.student_id} · {packages.length} package{packages.length === 1 ? '' : 's'}
                {!selected.is_active ? ' · Inactive' : ''}
              </Text>
            </MotiView>

            {packages.length === 0 ? (
              <MotiView {...rise(60)} style={historyCardStyles.emptyCard}>
                <Text style={historyCardStyles.emptyLabel}>NO PACKAGES YET</Text>
                <Text style={historyCardStyles.emptyBody}>
                  This student has never been assigned a session package.
                </Text>
              </MotiView>
            ) : (
              packages.map((pkg, i) => <PackageCard key={pkg.id} pkg={pkg} delay={60 + i * 40} />)
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.pickContainer}>
        <MotiView {...rise(0)}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Pick a student to see their attendance and packages</Text>
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

        {studentsLoading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={RED} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ gap: 8, paddingTop: 14, paddingBottom: 24 }}
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
                {!item.is_active ? (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          />
        )}
      </View>
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
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED, maxWidth: 240 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 24 },

  pickContainer: { flex: 1, paddingHorizontal: 24, gap: 14 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: MUTED, marginTop: 2 },

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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  pickIdentity: { flex: 1, gap: 2, marginLeft: 14 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },
  inactiveBadge: {
    backgroundColor: 'rgba(225,25,25,.1)',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,.3)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  inactiveBadgeText: { fontFamily: fonts.mono, fontSize: 9.5, color: RED },
});
