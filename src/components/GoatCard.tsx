import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';

type GoatCardProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

/**
 * Base surface for stat tiles, list containers, and panels. Enters with a
 * short rise-and-settle so a screen full of cards doesn't pop in flat.
 */
export function GoatCard({ children, delay = 0, className = '' }: GoatCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260, delay }}
    >
      <View className={`rounded-2xl border border-goat-overlay/10 bg-goat-surface p-4 ${className}`}>
        {children}
      </View>
    </MotiView>
  );
}
