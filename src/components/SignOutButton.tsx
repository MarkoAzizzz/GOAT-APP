import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../features/auth/AuthContext';
import { ConfirmModal } from './ConfirmModal';

const RED = '#E11919';

/** Width the shells reserve in their headers so titles wrap before reaching it. */
export const SIGN_OUT_CLEARANCE = 44;

/**
 * Sign out, reachable from every tab in both shells. Pinned to the top-right
 * corner — the one spot no screen anchors content to. Bottom-right is taken
 * by the Score tab's "Next" button and by list rows that scroll to the
 * bottom edge, so a button there would sit on top of them.
 *
 * Confirms first: on every screen, a stray tap would otherwise drop the user
 * back to the login form.
 */
export function SignOutButton() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <View style={[styles.anchor, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => setConfirming(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          android_ripple={{ color: 'rgba(225,25,25,0.25)', borderless: true }}
          style={styles.button}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </Svg>
        </Pressable>
      </View>

      <ConfirmModal
        visible={confirming}
        title="Sign out?"
        message="You'll need to log in again to get back in."
        confirmLabel="Sign out"
        onConfirm={() => {
          setConfirming(false);
          logout();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // box-none on the anchor so only the button itself takes touches — the
  // rest of the corner stays tappable by whatever is underneath.
  anchor: { position: 'absolute', right: 20, zIndex: 10 },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#141010',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
