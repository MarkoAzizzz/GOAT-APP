import React, { useEffect } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const MASCOT = require('../../assets/Goat-mascot-removedbgAI.png');

type GoatMascotBackdropProps = {
  restOpacity?: number;
};

const MASCOT_ASPECT = 1176 / 1338; // width / height

/**
 * One mascot, mounted once, shared across the login form and the
 * post-login screen — it never re-enters or moves between phases, so the
 * two screens read as one continuous place. Entrance: fade + scale down to
 * rest (520ms), then a slow ambient "breathing" scale loop indefinitely.
 *
 * Dimensions/opacity match the original design spec: full width, top offset
 * 40, resting opacity 0.28. This is the real AI-background-removed asset
 * (genuine alpha transparency, no chroma-key/contrast workaround needed).
 * Width/height are computed explicitly (not via the `aspectRatio` style)
 * because RN Web was resolving `aspectRatio` against the image's native
 * pixel height instead of the container width, rendering it ~12x too tall.
 */
export function GoatMascotBackdrop({ restOpacity = 0.28 }: GoatMascotBackdropProps) {
  const { width: windowWidth } = useWindowDimensions();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1.08);

  useEffect(() => {
    opacity.value = withTiming(restOpacity, { duration: 520, easing: Easing.bezier(0.16, 0.84, 0.44, 1) });
    scale.value = withSequence(
      withTiming(1, { duration: 520, easing: Easing.bezier(0.16, 0.84, 0.44, 1) }),
      withDelay(
        0,
        withRepeat(
          withSequence(
            withTiming(1.022, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.mascotWrap, animatedStyle]}>
        <Image
          source={MASCOT}
          style={{ width: windowWidth, height: windowWidth / MASCOT_ASPECT }}
          resizeMode="contain"
        />
      </Animated.View>
      <LinearGradient
        colors={['#050505', 'rgba(5,5,5,0.92)', 'rgba(5,5,5,0.35)', 'rgba(5,5,5,0.1)']}
        locations={[0.26, 0.44, 0.68, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mascotWrap: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
