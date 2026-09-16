import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';

type LeaderboardRowProps = {
  rank: number;
  name: string;
  score: number;
  isSelf?: boolean;
  moved?: 'up' | null;
};

/**
 * A single leaderboard row. When `moved="up"`, it plays the rank-climb beat
 * once on mount: a brief red-tinted lift, then settles — the mobile
 * equivalent of the "bump" token in the motion spec.
 */
export function LeaderboardRow({ rank, name, score, isSelf, moved }: LeaderboardRowProps) {
  return (
    <MotiView
      from={moved === 'up' ? { translateY: 0, backgroundColor: 'rgba(225,25,25,0)' } : undefined}
      animate={
        moved === 'up'
          ? {
              // Moti applies `transition.duration` to EACH step of a sequence,
              // not the whole array — 3 values here means 2 segments, so this
              // reads as ~1s up + hold, ~0.7s settle, matching the web bump.
              translateY: [0, -22, 0],
              backgroundColor: ['rgba(225,25,25,0)', 'rgba(225,25,25,0.16)', 'rgba(225,25,25,0)'],
            }
          : undefined
      }
      transition={{ type: 'timing', duration: 550, loop: true, repeatReverse: false }}
      className="mb-1 flex-row items-center gap-3 rounded-lg px-2 py-2"
    >
      <View className="w-6 items-center">
        <Text className="font-mono text-[12px] text-goat-subtext">{rank}</Text>
      </View>
      <Text className={`flex-1 text-[13px] ${isSelf ? 'font-bold text-goat-text' : 'text-goat-text'}`}>
        {name}
      </Text>
      <Text className="font-mono text-[12px] text-goat-subtext">{score}</Text>
    </MotiView>
  );
}
