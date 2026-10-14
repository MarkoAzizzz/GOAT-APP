import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { fonts } from '../../theme/fonts';

export function ComingSoonTab({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 22 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320 }}
        style={{ gap: 8, alignItems: 'center' }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontFamily: fonts.displayBold, fontSize: 24, color: '#F5F5F5', textTransform: 'uppercase' },
  subtitle: { fontFamily: fonts.mono, fontSize: 13, color: '#9BA3A7' },
});
