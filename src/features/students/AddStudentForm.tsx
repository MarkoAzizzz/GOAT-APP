import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { Branch, createStudent, getBranches } from './studentsService';

const SPORTS = ['boxing', 'kickboxing'] as const;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type AddStudentFormProps = {
  onBack: () => void;
  onCreated: () => void;
};

export function AddStudentForm({ onBack, onCreated }: AddStudentFormProps) {
  const { accessToken } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [sport, setSport] = useState<(typeof SPORTS)[number]>('boxing');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    getBranches(accessToken)
      .then((list) => {
        setBranches(list);
        if (list.length > 0) setBranchId(list[0].id);
      })
      .catch(() => setBranches([]));
  }, [accessToken]);

  const handleSubmit = async () => {
    if (!accessToken || submitting) return;
    if (!fullName.trim() || !email.trim() || !password || !branchId) {
      setError('Fill in every field.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createStudent(accessToken, {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        sport,
        branch: branchId,
        join_date: todayISO(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Add student</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            placeholderTextColor="#5C6266"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="student@goat.com"
            placeholderTextColor="#5C6266"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!pwVisible}
              placeholder="At least 8 characters"
              placeholderTextColor="#5C6266"
              style={[styles.input, styles.inputWithToggle]}
            />
            <Pressable onPress={() => setPwVisible((v) => !v)} style={styles.toggleButton} hitSlop={8}>
              <Text style={styles.toggleLabel}>{pwVisible ? 'HIDE' : 'SHOW'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sport</Text>
          <View style={styles.chipRow}>
            {SPORTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSport(s)}
                style={[styles.chip, sport === s && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, sport === s && styles.chipLabelActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Branch</Text>
          <View style={styles.chipRow}>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setBranchId(b.id)}
                style={[styles.chip, branchId === b.id && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, branchId === b.id && styles.chipLabelActive]}>{b.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={handleSubmit} style={styles.submitButton} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#F5F5F5" /> : <Text style={styles.submitLabel}>Create student</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#9BA3A7' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48, gap: 18 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5', textTransform: 'uppercase', marginBottom: 4 },
  field: { gap: 8 },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: '#9BA3A7',
    textTransform: 'uppercase',
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
    backgroundColor: '#101010',
    color: '#F5F5F5',
    fontFamily: fonts.body,
    fontSize: 15,
  },
  inputWithToggle: { paddingRight: 70 },
  toggleButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  toggleLabel: { fontFamily: fonts.displayBold, fontSize: 11, letterSpacing: 1.6, color: '#9BA3A7' },
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
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#9BA3A7', textTransform: 'capitalize' },
  chipLabelActive: { color: '#F5F5F5' },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: '#f04a4a', textAlign: 'center' },
  submitButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitLabel: { fontFamily: fonts.displayExtraBold, fontSize: 17, letterSpacing: 1.6, color: '#F5F5F5', textTransform: 'uppercase' },
});
