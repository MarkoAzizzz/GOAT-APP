import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

export type Pillar = { label: string; value: number };

/**
 * Five-pillar summary strip. Bars grow in with a slight overshoot, staggered
 * left to right, so the row reads as one energetic beat rather than five
 * separate animations.
 */
export function PillarBars({ pillars }: { pillars: Pillar[] }) {
  // No items-end here: RN's row default is stretch, which is what lets
  // the flex-1 track below actually receive a height to grow into.
  return (
    <View className="mt-auto flex-row gap-1.5" style={{ height: 44 }}>
      {pillars.map((pillar, i) => (
        <View key={pillar.label} className="flex-1 gap-1.5">
          <View className="w-full flex-1 justify-end overflow-hidden rounded-sm bg-goat-elevated">
            <MotiView
              from={{ height: '0%' }}
              animate={{ height: `${pillar.value}%` }}
              transition={{
                type: 'timing',
                duration: 450,
                delay: i * 80,
                easing: Easing.out(Easing.back(1.6)),
              }}
              className="w-full rounded-sm bg-goat-red"
            />
          </View>
        </View>
      ))}
    </View>
  );
}
