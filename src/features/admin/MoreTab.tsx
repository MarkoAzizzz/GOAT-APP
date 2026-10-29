import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';
import { CheckInScreen } from '../packages/CheckInScreen';
import { SIGN_OUT_CLEARANCE } from '../../components/SignOutButton';

const RED = '#E11919';
// Same curve the tab bar uses for its rail, so the push reads as part of
// the same navigation language rather than a separate effect.
const PUSH_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

export function MoreTab() {
  const { logout } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [screen, setScreen] = useState<'menu' | 'check-in'>('menu');

  // container 24*2 padding, row 16*2 padding, 38 icon + 14 gap, 18 chevron + 12 gap
  const menuTextWidth = windowWidth - 48 - 32 - 52 - 30;

  // A push, not a route change: the check-in panel slides in from the right
  // over the menu while the tab bar stays put, so the coach can jump straight
  // to another tab without backing out first.
  if (screen === 'check-in') {
    return (
      <MotiView
        from={{ translateX: windowWidth }}
        animate={{ translateX: 0 }}
        transition={{ type: 'timing', duration: 320, easing: PUSH_EASING }}
        style={styles.pushed}
      >
        <CheckInScreen onBack={() => setScreen('menu')} />
      </MotiView>
    );
  }

  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 22 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320 }}
        style={styles.header}
      >
        <Text style={styles.title}>More</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 22 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320, delay: 60 }}
      >
        <Pressable
          onPress={() => setScreen('check-in')}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
          style={styles.menuRow}
        >
          <View style={styles.menuIcon}>
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke={RED}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </Svg>
          </View>
          <View style={[styles.menuText, { width: menuTextWidth }]}>
            <Text style={styles.menuLabel}>Check in</Text>
            <Text style={styles.menuSub} numberOfLines={1}>
              Session packages and attendance
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </MotiView>

      <Text style={styles.note}>Analytics, branches and settings coming soon</Text>

      <Pressable onPress={logout} style={styles.signOut}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pushed: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 16 },
  header: { paddingRight: SIGN_OUT_CLEARANCE },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: '#F5F5F5' },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.07)',
    borderRadius: 12,
    padding: 16,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#141010',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Width is set inline from the window: flex sizing collapses row children
  // to zero width on some Android builds, which hides the text entirely.
  menuText: { marginLeft: 14 },
  menuLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#F5F5F5' },
  menuSub: { fontFamily: fonts.body, fontSize: 12.5, color: '#9BA3A7', marginTop: 2 },
  chevron: { fontFamily: fonts.mono, fontSize: 18, color: '#9BA3A7', marginLeft: 12 },

  note: { fontFamily: fonts.body, fontSize: 12.5, color: '#5C6266' },

  signOut: {
    marginTop: 'auto',
    marginBottom: 16,
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
