import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { apiPost, ApiError } from '../../lib/api';
import { StudentSelf } from './useStudentSelf';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#34d399';
const MUTED = '#9BA3A7';

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

function formatMonth(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function ChangePassword() {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  };

  const submit = async () => {
    if (!accessToken) return;
    // Checked here as well as server-side so the mismatch case doesn't cost a round trip.
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiPost(
        '/auth/change-password/',
        { current_password: current, new_password: next, new_password_confirm: confirm },
        accessToken
      );
      setDone(true);
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => {
          setOpen(true);
          setDone(false);
        }}
        style={styles.actionRow}
      >
        <Text style={styles.actionLabel}>Change password</Text>
        <Text style={[styles.actionHint, done && { color: GAIN }]}>{done ? 'Changed' : '›'}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>CHANGE PASSWORD</Text>
      <TextInput
        value={current}
        onChangeText={setCurrent}
        placeholder="Current password"
        placeholderTextColor="#5C6266"
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        value={next}
        onChangeText={setNext}
        placeholder="New password"
        placeholderTextColor="#5C6266"
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm new password"
        placeholderTextColor="#5C6266"
        secureTextEntry
        style={styles.input}
      />
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
      <View style={styles.formButtons}>
        <Pressable
          onPress={() => {
            setOpen(false);
            reset();
          }}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={busy || !current || !next || !confirm}
          style={[styles.saveButton, (busy || !current || !next || !confirm) && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator color="#F5F5F5" size="small" />
          ) : (
            <Text style={styles.saveLabel}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function StudentProfileTab({ self }: { self: StudentSelf }) {
  const { logout } = useAuth();
  const { student, progress, entry, loading, failed } = self;

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (failed || !student) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load your profile.</Text>
      </View>
    );
  }

  const rows: { k: string; v: string }[] = [
    {
      k: 'Peak rating',
      v: progress?.highest_rating != null ? progress.highest_rating.toFixed(0) : '—',
    },
    {
      k: 'Average rating',
      v: progress?.average_rating != null ? progress.average_rating.toFixed(0) : '—',
    },
    { k: 'Sessions', v: String(progress?.total_assessments ?? 0) },
    { k: 'Member since', v: formatMonth(student.join_date) },
    { k: 'Branch', v: student.branch_name || '—' },
    { k: 'Email', v: student.email },
  ];

  const rating = progress?.current_rating ?? parseFloat(student.rating);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <MotiView {...rise(0)} style={styles.card}>
        <View style={styles.portrait}>
          <Text style={styles.portraitText}>{initials(student.full_name)}</Text>
        </View>
        <Text style={styles.name}>{student.full_name}</Text>
        <Text style={styles.meta}>
          {student.student_id} · {student.sport}
        </Text>
        <View style={styles.pillRow}>
          <View style={styles.pillRed}>
            <Text style={styles.pillRedText}>
              {Number.isNaN(rating) ? '—' : `${rating.toFixed(0)} pts`}
            </Text>
          </View>
          {entry?.rank != null ? (
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>Rank #{entry.rank}</Text>
            </View>
          ) : null}
        </View>
      </MotiView>

      <MotiView {...rise(60)} style={styles.rows}>
        {rows.map((r, i) => (
          <View key={r.k} style={[styles.detailRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.detailKey}>{r.k}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {r.v}
            </Text>
          </View>
        ))}
      </MotiView>

      <MotiView {...rise(120)} style={{ gap: 10 }}>
        <ChangePassword />
        <Pressable onPress={logout} style={styles.signOut}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: MUTED },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 18 },

  // marginTop, not paddingTop: the red rule is the card's top border, so the
  // whole card has to start below the shell's sign-out button or the rule
  // runs underneath it. The button sits at insets.top + 8 and is 34 tall.
  card: {
    marginTop: 38,
    borderTopWidth: 2,
    borderTopColor: RED,
    paddingTop: 16,
    alignItems: 'center',
    gap: 6,
  },
  portrait: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitText: { fontFamily: fonts.bodySemiBold, fontSize: 22, color: '#F5F5F5' },
  name: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: '#F5F5F5',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    color: RED,
    textTransform: 'uppercase',
  },
  pillRow: { flexDirection: 'row', marginTop: 8 },
  pillRed: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,.4)',
    backgroundColor: 'rgba(225,25,25,.12)',
  },
  pillRedText: { fontFamily: fonts.mono, fontSize: 11, color: RED },
  pillGreen: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,.4)',
    backgroundColor: 'rgba(52,211,153,.12)',
    marginLeft: 8,
  },
  pillGreenText: { fontFamily: fonts.mono, fontSize: 11, color: GAIN },

  rows: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  detailKey: { fontFamily: fonts.body, fontSize: 13, color: MUTED },
  detailValue: { fontFamily: fonts.mono, fontSize: 12.5, color: '#F5F5F5', marginLeft: 12 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  actionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },
  actionHint: { fontFamily: fonts.mono, fontSize: 13, color: MUTED },

  formCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  formLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: MUTED },
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
  errorLine: { fontFamily: fonts.body, fontSize: 12.5, color: RED },
  formButtons: { flexDirection: 'row', marginTop: 2 },
  cancelButton: {
    height: 46,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  saveButton: {
    height: 46,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  saveLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },

  signOut: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    letterSpacing: 1.6,
    color: RED,
    textTransform: 'uppercase',
  },
});
