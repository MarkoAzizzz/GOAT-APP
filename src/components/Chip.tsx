import React from 'react';
import { Text } from 'react-native';
import { MotiView } from 'moti';

type ChipProps = {
  label: string;
  tone?: 'red' | 'amber' | 'green' | 'neutral';
  delay?: number;
};

const TONE_CLASSES: Record<NonNullable<ChipProps['tone']>, { border: string; text: string }> = {
  red: { border: 'border-goat-red/40', text: 'text-goat-red' },
  amber: { border: 'border-goat-amber/40', text: 'text-goat-amber' },
  green: { border: 'border-goat-green/40', text: 'text-goat-green' },
  neutral: { border: 'border-goat-overlay/20', text: 'text-goat-subtext' },
};

/** Level badges, rank-delta pills, status tags. Pops in with a quick overshoot. */
export function Chip({ label, tone = 'neutral', delay = 0 }: ChipProps) {
  const { border, text } = TONE_CLASSES[tone];
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 9, stiffness: 220, delay }}
      className={`self-start rounded-full border px-3 py-1 ${border}`}
    >
      <Text className={`font-mono text-[10px] font-bold uppercase tracking-widest ${text}`}>
        {label}
      </Text>
    </MotiView>
  );
}
