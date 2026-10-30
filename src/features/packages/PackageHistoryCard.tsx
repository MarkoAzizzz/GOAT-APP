import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { SessionPackage } from './packagesService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const GAIN = '#34d399';
const MUTED = '#9BA3A7';

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 22 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 340, delay, easing: RISE_EASING },
  };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function Dots({ total, used }: { total: number; used: number }) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={i < used ? styles.dotFilled : styles.dotEmpty} />
      ))}
    </View>
  );
}

/** One package's card: dot-grid attendance, Active/Completed badge, dates.
 * Shared between the student's own History tab and the admin's lookup
 * screen — same data shape, same card either way. */
export function PackageCard({ pkg, delay }: { pkg: SessionPackage; delay: number }) {
  const isActive = pkg.closed_at === null;
  // check_ins is newest-first (model ordering), so the first entry is the
  // most recent attendance on this package.
  const lastCheckIn = pkg.check_ins[0]?.checked_in_at ?? null;

  return (
    <MotiView {...rise(delay)} style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{pkg.total_sessions}-session package</Text>
        <View style={isActive ? styles.badgeActive : styles.badgeDone}>
          <Text style={isActive ? styles.badgeTextActive : styles.badgeTextDone}>
            {isActive ? 'ACTIVE' : 'COMPLETED'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {isActive
          ? `Assigned ${formatDate(pkg.assigned_at)}`
          : `${formatDate(pkg.assigned_at)} – ${formatDate(pkg.closed_at as string)}`}
      </Text>
      <Dots total={pkg.total_sessions} used={pkg.used_sessions} />
      <Text style={styles.cardFooter}>
        {pkg.used_sessions} of {pkg.total_sessions} attended
        {lastCheckIn ? ` · last ${formatDate(lastCheckIn)}` : ''}
      </Text>
    </MotiView>
  );
}

export const historyCardStyles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  emptyLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4, color: MUTED },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: '#F5F5F5', lineHeight: 21 },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardActive: { borderColor: 'rgba(225,25,25,.3)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: '#F5F5F5' },
  cardMeta: { fontFamily: fonts.body, fontSize: 12, color: MUTED, marginTop: -6 },
  cardFooter: { fontFamily: fonts.mono, fontSize: 11.5, color: MUTED },

  badgeActive: {
    backgroundColor: 'rgba(52,211,153,.12)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTextActive: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: GAIN,
  },
  badgeDone: {
    backgroundColor: 'rgba(255,255,255,.08)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTextDone: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: MUTED,
  },

  dotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dotFilled: { width: 12, height: 12, borderRadius: 6, backgroundColor: RED },
  dotEmpty: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.1)' },
});
