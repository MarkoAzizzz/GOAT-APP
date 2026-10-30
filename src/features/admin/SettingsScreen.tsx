import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Constants from 'expo-constants';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { ChangePasswordCard } from '../../components/ChangePasswordCard';
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

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <MotiView {...rise(0)}>
            <Text style={styles.title}>Settings</Text>
          </MotiView>

          <MotiView {...rise(40)} style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.rows}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Name</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{user?.full_name ?? '—'}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>Email</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
              </View>
            </View>
            <ChangePasswordCard scrollRef={scrollRef} />
          </MotiView>

          <MotiView {...rise(80)} style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>APP</Text>
            <View style={styles.rows}>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>Version</Text>
                <Text style={styles.detailValue}>{appVersion}</Text>
              </View>
            </View>
          </MotiView>

          <MotiView {...rise(120)}>
            <Pressable onPress={logout} style={styles.signOut}>
              <Text style={styles.signOutLabel}>Sign out</Text>
            </Pressable>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: MUTED },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, gap: 22 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#F5F5F5' },

  sectionLabel: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.6, color: MUTED },
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
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  detailKey: { fontFamily: fonts.body, fontSize: 13, color: MUTED },
  detailValue: { fontFamily: fonts.mono, fontSize: 12.5, color: '#F5F5F5', marginLeft: 12 },

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
