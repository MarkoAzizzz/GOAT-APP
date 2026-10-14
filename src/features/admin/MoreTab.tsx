import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../auth/AuthContext';

export function MoreTab() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 22 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320 }}
        style={{ gap: 8, alignItems: 'center' }}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Analytics, branches, and settings coming soon</Text>
      </MotiView>

      <Pressable onPress={logout} style={styles.signOut}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  title: { fontFamily: fonts.displayBold, fontSize: 24, color: '#F5F5F5', textTransform: 'uppercase' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: '#9BA3A7', textAlign: 'center' },
  signOut: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { fontFamily: fonts.displayBold, fontSize: 14, letterSpacing: 1.6, color: '#E11919', textTransform: 'uppercase' },
});
