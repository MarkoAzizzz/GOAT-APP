import React, { useEffect, useState } from 'react';
import { View, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';

type WipeRevealProps = {
  children: React.ReactNode;
  /** Rendered width of the content, if already known (e.g. a fixed-size
   * logo image) — skips measurement entirely. Omit for dynamic-width
   * content (e.g. text whose length varies) and it will be measured via an
   * invisible, unclipped copy first (measuring inside the clipped/animated
   * container itself always reports 0 — that's not a shortcut, it's a bug). */
  width?: number;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function WipeReveal({ children, width: fixedWidth, delay = 0, duration = 560, style }: WipeRevealProps) {
  const [measured, setMeasured] = useState<number | null>(fixedWidth ?? null);
  const revealWidth = useSharedValue(0);

  useEffect(() => {
    if (measured == null) return;
    revealWidth.value = withDelay(delay, withTiming(measured, { duration, easing: Easing.bezier(0.22, 0.9, 0.3, 1) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured]);

  const animatedStyle = useAnimatedStyle(() => ({ width: revealWidth.value }));

  const onMeasureLayout = (e: LayoutChangeEvent) => {
    if (measured == null) setMeasured(e.nativeEvent.layout.width);
  };

  if (measured == null) {
    // Rendered off-screen, unclipped, purely to get a correct natural width.
    return (
      <View style={{ position: 'absolute', opacity: 0 }} onLayout={onMeasureLayout} pointerEvents="none">
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[{ overflow: 'hidden' }, animatedStyle, style]}>
      <View style={{ width: measured, flexDirection: 'row' }}>{children}</View>
    </Animated.View>
  );
}
