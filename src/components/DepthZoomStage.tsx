import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

const DURATION = 420;
const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

type DepthZoomStageProps = {
  activeKey: string;
  renderScreen: (key: string) => React.ReactNode;
};

/**
 * "Depth zoom" screen transition — the one picked as the reference direction
 * for the app's tab switches. The outgoing screen pushes past the camera
 * (scales up, fades), the incoming one rises from behind it (scales up from
 * 0.8, fades in). Deliberately NOT using Moti's AnimatePresence: it's a
 * re-export of framer-motion's web implementation and doesn't reliably
 * orchestrate unmount timing on native. Instead the outgoing screen is kept
 * mounted just long enough to play its exit, then removed via state —
 * the same two-phase approach used in the animation reference.
 */
export function DepthZoomStage({ activeKey, renderScreen }: DepthZoomStageProps) {
  const [outgoingKey, setOutgoingKey] = useState<string | null>(null);
  const prevKey = useRef(activeKey);

  useEffect(() => {
    if (prevKey.current !== activeKey) {
      setOutgoingKey(prevKey.current);
      prevKey.current = activeKey;
      const timer = setTimeout(() => setOutgoingKey(null), DURATION);
      return () => clearTimeout(timer);
    }
  }, [activeKey]);

  return (
    <View className="flex-1 bg-goat-bg">
      {outgoingKey && (
        <MotiView
          key={`out-${outgoingKey}`}
          from={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.2 }}
          transition={{ type: 'timing', duration: DURATION, easing: Easing.out(Easing.ease) }}
          style={FILL}
          pointerEvents="none"
        >
          {renderScreen(outgoingKey)}
        </MotiView>
      )}
      <MotiView
        key={`in-${activeKey}`}
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: DURATION, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }}
        style={FILL}
      >
        {renderScreen(activeKey)}
      </MotiView>
    </View>
  );
}
