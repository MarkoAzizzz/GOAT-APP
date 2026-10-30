import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { fonts } from '../theme/fonts';
import { useAuth } from '../features/auth/AuthContext';
import { apiPost, ApiError } from '../lib/api';

const RED = '#E11919';
const GAIN = '#34d399';
const MUTED = '#9BA3A7';

type ScrollViewRef = React.RefObject<{ scrollToEnd: (opts?: { animated?: boolean }) => void } | null>;

/**
 * Collapsible change-password form — works for any role, since
 * /auth/change-password/ only checks IsAuthenticated. Shared between the
 * student profile and admin settings so the keyboard-avoidance and
 * show/hide behavior can't drift between the two.
 */
export function ChangePasswordCard({ scrollRef }: { scrollRef: ScrollViewRef }) {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentVisible, setCurrentVisible] = useState(false);
  const [nextVisible, setNextVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The form sits at the bottom of the screen, so the keyboard covers it the
  // moment a field is focused unless the scroll view is pushed down to meet it.
  const scrollToForm = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

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
      <View style={{ position: 'relative' }}>
        <TextInput
          value={current}
          onChangeText={setCurrent}
          onFocus={scrollToForm}
          placeholder="Current password"
          placeholderTextColor="#5C6266"
          secureTextEntry={!currentVisible}
          style={[styles.input, styles.inputWithToggle]}
        />
        <Pressable onPress={() => setCurrentVisible((v) => !v)} style={styles.toggleButton} hitSlop={8}>
          <Text style={styles.toggleLabel}>{currentVisible ? 'HIDE' : 'SHOW'}</Text>
        </Pressable>
      </View>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={next}
          onChangeText={setNext}
          onFocus={scrollToForm}
          placeholder="New password"
          placeholderTextColor="#5C6266"
          secureTextEntry={!nextVisible}
          style={[styles.input, styles.inputWithToggle]}
        />
        <Pressable onPress={() => setNextVisible((v) => !v)} style={styles.toggleButton} hitSlop={8}>
          <Text style={styles.toggleLabel}>{nextVisible ? 'HIDE' : 'SHOW'}</Text>
        </Pressable>
      </View>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          onFocus={scrollToForm}
          placeholder="Confirm new password"
          placeholderTextColor="#5C6266"
          secureTextEntry={!confirmVisible}
          style={[styles.input, styles.inputWithToggle]}
        />
        <Pressable onPress={() => setConfirmVisible((v) => !v)} style={styles.toggleButton} hitSlop={8}>
          <Text style={styles.toggleLabel}>{confirmVisible ? 'HIDE' : 'SHOW'}</Text>
        </Pressable>
      </View>
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

const styles = StyleSheet.create({
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
  inputWithToggle: { paddingRight: 70 },
  toggleButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  toggleLabel: { fontFamily: fonts.displayBold, fontSize: 11, letterSpacing: 1.6, color: MUTED },
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
});
