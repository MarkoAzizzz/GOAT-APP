import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { fonts } from '../../theme/fonts';
import { SessionPackage } from './packagesService';

const RISE_EASING = Easing.bezier(0.16, 0.84, 0.44, 1);
const RED = '#E11919';
const WARN = '#fbbf24';

/** Only these counts are worth interrupting someone over. */
const WARN_AT = 1;
const EXHAUSTED_AT = 0;

type Tone = { bg: string; border: string; accent: string; title: string; body: string };

function toneFor(remaining: number): Tone | null {
  if (remaining === WARN_AT) {
    return {
      bg: '#1C1708',
      border: 'rgba(251,191,36,.35)',
      accent: WARN,
      title: '1 session left',
      body: "Don't forget to renew before your next session so your training doesn't pause.",
    };
  }
  if (remaining === EXHAUSTED_AT) {
    return {
      bg: '#1C0F0F',
      border: 'rgba(225,25,25,.35)',
      accent: RED,
      title: 'Your package is complete',
      body: 'Once you renew, your upcoming sessions will be counted from the new package.',
    };
  }
  return null;
}

/**
 * Low-balance warning on the student's Home.
 *
 * Dismissal is keyed to the remaining count rather than a flag, so closing
 * it at 1 session keeps it closed — but dropping to 0 is a new situation
 * and shows again. That way a dismissal is respected without letting the
 * student miss the moment their package actually runs out.
 */
export function PackageBanner({ sessionPackage }: { sessionPackage: SessionPackage | null }) {
  const { width: windowWidth } = useWindowDimensions();
  const remaining = sessionPackage?.remaining_sessions ?? null;
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // Explicit width, not flex: flex sizing collapses row children to zero
  // width on some Android builds. 48 page padding, 28 banner padding,
  // 34 close button.
  const textWidth = windowWidth - 48 - 28 - 34;

  useEffect(() => {
    if (remaining != null && dismissedAt != null && remaining !== dismissedAt) {
      setDismissedAt(null);
    }
  }, [remaining, dismissedAt]);

  if (remaining == null) return null;
  if (dismissedAt === remaining) return null;

  const tone = toneFor(remaining);
  if (!tone) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, easing: RISE_EASING }}
      style={[styles.banner, { backgroundColor: tone.bg, borderColor: tone.border }]}
    >
      <View style={{ width: textWidth }}>
        <Text style={[styles.title, { color: tone.accent }]} numberOfLines={1}>
          {tone.title}
        </Text>
        <Text style={styles.body}>{tone.body}</Text>
      </View>

      <Pressable
        onPress={() => setDismissedAt(remaining)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
        style={styles.close}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 14, letterSpacing: 0.4, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: 12.5, color: '#CFD4D7', lineHeight: 18, marginTop: 3 },
  close: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  closeText: { fontFamily: fonts.mono, fontSize: 18, color: '#9BA3A7', lineHeight: 20 },
});
