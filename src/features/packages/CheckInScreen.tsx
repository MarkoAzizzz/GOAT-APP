import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../lib/api';
import {
  getCheckInRoster,
  checkInStudent,
  assignPackage,
  undoCheckIn,
  CheckInRow,
} from './packagesService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#34d399';
const WARN = '#fbbf24';
const MUTED = '#9BA3A7';

/** How long the undo toast stays up before it stops being offered. */
const UNDO_WINDOW_MS = 6000;
/** Clears the shell's tab bar, which stays visible over this screen. */
const TOAST_ABOVE_TAB_BAR = 16;

/**
 * Press feedback via android_ripple rather than Pressable's function-form
 * style. Since the SDK 58 upgrade that function form is ignored entirely —
 * the returned styles never reach the view, leaving buttons unstyled.
 */
const RIPPLE = { color: 'rgba(255,255,255,0.12)' };

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

/** Green while there's room, amber on the last one, red once it's spent. */
function balanceColor(remaining: number | null): string {
  if (remaining == null) return MUTED;
  if (remaining === 0) return RED;
  if (remaining <= 1) return WARN;
  return GAIN;
}

type UndoState = { studentUuid: string; studentName: string; checkInId: string } | null;

type CheckInScreenProps = { onBack: () => void };

/**
 * Admin check-in roster. One tap records attendance and offers a brief undo,
 * which suits a busy door better than a confirm dialog on every student.
 *
 * The row is updated from the package the server returns rather than being
 * decremented locally, so the displayed balance always matches what was
 * actually recorded.
 */
export function CheckInScreen({ onBack }: CheckInScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { accessToken } = useAuth();

  const [rows, setRows] = useState<CheckInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contentWidth = windowWidth - 48;

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setFailed(false);
    getCheckInRoster(accessToken)
      .then(setRows)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(load, [load]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.student_name.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const patchRow = (studentUuid: string, patch: Partial<CheckInRow>) =>
    setRows((prev) => prev.map((r) => (r.student_uuid === studentUuid ? { ...r, ...patch } : r)));

  const offerUndo = (state: UndoState) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(state);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
  };

  const handleCheckIn = async (row: CheckInRow) => {
    if (!accessToken || busyId) return;
    setBusyId(row.student_uuid);
    setError(null);
    try {
      const pkg = await checkInStudent(accessToken, row.student_uuid);
      patchRow(row.student_uuid, {
        remaining_sessions: pkg.remaining_sessions,
        total_sessions: pkg.total_sessions,
        has_package: true,
        last_check_in_at: new Date().toISOString(),
      });
      // The newest entry is first; its id is what undo deletes.
      const latest = pkg.check_ins[0];
      if (latest) {
        offerUndo({
          studentUuid: row.student_uuid,
          studentName: row.student_name,
          checkInId: latest.id,
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not check in.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async () => {
    if (!accessToken || !undo) return;
    const target = undo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    try {
      const pkg = await undoCheckIn(accessToken, target.studentUuid, target.checkInId);
      patchRow(target.studentUuid, { remaining_sessions: pkg.remaining_sessions });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not undo.');
    }
  };

  const handleAssign = async (row: CheckInRow, size: 8 | 12) => {
    if (!accessToken) return;
    setBusyId(row.student_uuid);
    setError(null);
    try {
      const pkg = await assignPackage(accessToken, row.student_uuid, size);
      patchRow(row.student_uuid, {
        has_package: true,
        total_sessions: pkg.total_sessions,
        remaining_sessions: pkg.remaining_sessions,
      });
      setRenewingId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not assign package.');
    } finally {
      setBusyId(null);
    }
  };

  const RIGHT_W = 104;
  const identityWidth = contentWidth - 26 - 42 - 14 - RIGHT_W - 10;

  const renderRow = ({ item, index }: { item: CheckInRow; index: number }) => {
    const spent = item.has_package && item.remaining_sessions === 0;
    const needsPackage = !item.has_package || spent;
    const isRenewing = renewingId === item.student_uuid;
    const isBusy = busyId === item.student_uuid;

    return (
      <MotiView {...rise(60 + Math.min(index, 8) * 30)}>
        <View style={[styles.row, needsPackage && styles.rowNeedsPackage]}>
          <View style={styles.rowTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.student_name)}</Text>
            </View>

            <View style={{ width: identityWidth, marginLeft: 14 }}>
              <Text style={styles.name} numberOfLines={1}>{item.student_name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.student_id} · {item.sport}
              </Text>
            </View>

            <View style={{ width: RIGHT_W, alignItems: 'flex-end', marginLeft: 10 }}>
              {item.has_package ? (
                <>
                  <Text style={[styles.remaining, { color: balanceColor(item.remaining_sessions) }]}>
                    {item.remaining_sessions}
                  </Text>
                  <Text style={styles.remainingLabel}>
                    of {item.total_sessions} left
                  </Text>
                </>
              ) : (
                <Text style={styles.noPackage}>No package</Text>
              )}
            </View>
          </View>

          {isRenewing ? (
            <View style={styles.renewRow}>
              <Text style={styles.renewPrompt}>New package:</Text>
              <Pressable
                onPress={() => handleAssign(item, 8)}
                disabled={isBusy}
                android_ripple={RIPPLE}
                style={styles.sizeButton}
              >
                <Text style={styles.sizeLabel}>8</Text>
              </Pressable>
              <Pressable
                onPress={() => handleAssign(item, 12)}
                disabled={isBusy}
                android_ripple={RIPPLE}
                style={styles.sizeButton}
              >
                <Text style={styles.sizeLabel}>12</Text>
              </Pressable>
              <Pressable onPress={() => setRenewingId(null)} hitSlop={8}>
                <Text style={styles.cancelRenew}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setRenewingId(item.student_uuid)}
                android_ripple={RIPPLE}
                style={styles.renewButton}
              >
                <Text style={styles.renewLabel}>{item.has_package ? 'Renew' : 'Assign package'}</Text>
              </Pressable>

              <Pressable
                onPress={() => handleCheckIn(item)}
                disabled={needsPackage || isBusy}
                android_ripple={RIPPLE}
                style={[
                  styles.checkInButton,
                  { width: contentWidth - 26 - 118 - 10 },
                  needsPackage && styles.checkInDisabled,
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator color="#F5F5F5" size="small" />
                ) : (
                  <Text style={[styles.checkInLabel, needsPackage && { color: MUTED }]}>
                    {spent ? 'Package finished' : needsPackage ? 'No package' : 'Check in'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </MotiView>
    );
  };

  return (
    <View style={styles.root}>
      {/* No safe-area inset here: this renders inside AdminShell, which has
          already applied it. Adding it again double-counts the status bar. */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLabel}>‹ More</Text>
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Session packages</Text>
        <Text style={styles.title}>Check in</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or id"
          placeholderTextColor="#5C6266"
          style={styles.search}
        />
      </View>

      {error ? <Text style={styles.errorLine}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={RED} />
        </View>
      ) : failed ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load the roster.</Text>
          <Pressable onPress={load} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.student_uuid}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>No students match.</Text>}
        />
      )}

      {undo ? (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220, easing: RISE_EASING }}
          style={[styles.toast, { bottom: TOAST_ABOVE_TAB_BAR }]}
        >
          <Text style={styles.toastText} numberOfLines={1}>
            {undo.studentName} checked in
          </Text>
          <Pressable onPress={handleUndo} hitSlop={8}>
            <Text style={styles.toastAction}>UNDO</Text>
          </Pressable>
        </MotiView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 24, paddingBottom: 4 },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  titleBlock: { paddingHorizontal: 24, paddingTop: 4, gap: 2 },
  eyebrow: { fontFamily: fonts.body, fontSize: 12.5, color: MUTED },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },

  searchWrap: { paddingHorizontal: 24, paddingTop: 14 },
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

  errorLine: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: RED,
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: MUTED },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
  },
  retryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#F5F5F5' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 24 },

  listContent: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 120, gap: 10 },

  row: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 13,
    gap: 11,
  },
  rowNeedsPackage: { borderColor: 'rgba(225,25,25,.3)' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED, marginTop: 2 },
  remaining: { fontFamily: fonts.monoMedium, fontSize: 22 },
  remainingLabel: { fontFamily: fonts.mono, fontSize: 10, color: MUTED, marginTop: 1 },
  noPackage: { fontFamily: fonts.mono, fontSize: 11, color: RED },

  actionRow: { flexDirection: 'row', alignItems: 'center' },
  renewButton: {
    width: 118,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#F5F5F5' },
  checkInButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkInDisabled: { backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(255,255,255,.1)' },
  checkInLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },

  renewRow: { flexDirection: 'row', alignItems: 'center' },
  renewPrompt: { fontFamily: fonts.body, fontSize: 13, color: MUTED, marginRight: 10 },
  sizeButton: {
    width: 52,
    height: 42,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sizeLabel: { fontFamily: fonts.monoMedium, fontSize: 16, color: '#F5F5F5' },
  cancelRenew: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: MUTED },

  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.14)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  toastText: { fontFamily: fonts.body, fontSize: 13.5, color: '#F5F5F5', flexShrink: 1 },
  toastAction: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 1.4,
    color: RED,
    marginLeft: 16,
  },
});
