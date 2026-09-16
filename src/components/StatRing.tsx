import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type StatRingProps = {
  percent: number;
  label: string;
  size?: number;
  strokeWidth?: number;
};

/**
 * The score ring — the single most-repeated motion moment in the app.
 * Fills from empty on mount, ~1s, ease-out. The number counts up in lockstep
 * rather than jumping straight to the final value. The count-up is driven
 * through a JS-thread reaction (not the native `text` animatedProp) so it
 * renders identically on native and on RN Web, where Text doesn't support
 * that shortcut.
 */
export function StatRing({ percent, label, size = 128, strokeWidth = 11 }: StatRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    progress.value = withTiming(percent, {
      duration: 1000,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
  }, [percent]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayPercent)(current);
      }
    },
  );

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(var(--c-bg-elevated))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E11919"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="font-mono text-[26px] font-bold text-goat-text">{displayPercent}%</Text>
        <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-goat-amber">
          {label}
        </Text>
      </View>
    </View>
  );
}
