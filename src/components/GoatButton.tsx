import React from 'react';
import { Text } from 'react-native';
import { MotiPressable } from 'moti/interactions';
// cssInterop registration for MotiPressable lives in src/theme/interop.ts,
// imported once at the app root — its runtime patch isn't reflected in
// MotiPressable's exported types, so className still needs this local widen.
const Pressable = MotiPressable as React.ComponentType<
  React.ComponentProps<typeof MotiPressable> & { className?: string }
>;

type GoatButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
};

/**
 * Primary CTA. Press feedback is an immediate, snappy scale-down — no ease-in
 * ramp — so it reads as responsive rather than soft. Matches the "tap: 100ms,
 * overshoot" motion spec from the design reference.
 */
export function GoatButton({ label, onPress, variant = 'primary' }: GoatButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.96 : 1,
        };
      }}
      transition={{ type: 'timing', duration: 100 }}
      className={
        isPrimary
          ? 'items-center justify-center rounded-xl bg-goat-red px-6 py-4'
          : 'items-center justify-center rounded-xl border border-goat-overlay/15 bg-transparent px-6 py-4'
      }
    >
      <Text
        className={
          isPrimary
            ? 'text-[13px] font-bold uppercase tracking-wide text-white'
            : 'text-[13px] font-bold uppercase tracking-wide text-goat-text'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
