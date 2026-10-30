import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';
import { getMyPackageHistory, SessionPackage } from '../packages/packagesService';
import { PackageCard, historyCardStyles } from '../packages/PackageHistoryCard';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const MUTED = '#9BA3A7';

function rise(delay: number) {
  return {
    from: { opacity: 0, translateY: 22 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 340, delay, easing: RISE_EASING },
  };
}

export function StudentHistoryTab() {
  const { accessToken } = useAuth();
  const [packages, setPackages] = useState<SessionPackage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getMyPackageHistory(accessToken)
      .then((rows) => {
        if (!cancelled) setPackages(rows);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (packages === null && !failed) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load your history.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <MotiView {...rise(0)} style={styles.header}>
        <Text style={styles.eyebrow}>Attendance</Text>
        <Text style={styles.title}>History</Text>
      </MotiView>

      {packages!.length === 0 ? (
        <MotiView {...rise(60)} style={historyCardStyles.emptyCard}>
          <Text style={historyCardStyles.emptyLabel}>NO PACKAGES YET</Text>
          <Text style={historyCardStyles.emptyBody}>
            Once your coach assigns your first session package, it'll show up here.
          </Text>
        </MotiView>
      ) : (
        packages!.map((pkg, i) => <PackageCard key={pkg.id} pkg={pkg} delay={60 + i * 40} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: MUTED },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 12 },

  header: { gap: 3, marginBottom: 6, paddingRight: SIGN_OUT_CLEARANCE },
  eyebrow: { fontFamily: fonts.body, fontSize: 12.5, color: MUTED },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },
});
