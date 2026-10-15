import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, LayoutChangeEvent, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { ADMIN_TABS, AdminTabKey } from './adminTabIcons';

const RED = '#E11919';
const STEEL = '#9BA3A7';

/** Minimal shape a tab needs — lets the student shell reuse this bar. */
export type TabDef = { key: string; label: string; icon: string };

type AdminTabBarProps = {
  activeKey: string;
  onChange: (key: any) => void;
  tabs?: readonly TabDef[];
};

export function AdminTabBar({ activeKey, onChange, tabs = ADMIN_TABS }: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const railLeft = useSharedValue(0);
  const tabWidth = barWidth / tabs.length;

  useEffect(() => {
    if (barWidth > 0) {
      railLeft.value = withTiming(activeIndex * tabWidth, { duration: 380, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, barWidth]);

  const onLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);
  const railStyle = useAnimatedStyle(() => ({ left: railLeft.value, width: tabWidth || 0 }));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]} onLayout={onLayout}>
      {barWidth > 0 && <Animated.View style={[styles.rail, railStyle]} />}
      <View style={styles.row}>
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={tab.key === activeKey} onPress={() => onChange(tab.key)} />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: TabDef;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) {
      scale.value = withSequence(
        withTiming(1.28, { duration: 140, easing: Easing.bezier(0.16, 0.84, 0.44, 1) }),
        withTiming(1, { duration: 200, easing: Easing.bezier(0.16, 0.84, 0.44, 1) })
      );
    }
    wasActive.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = active ? RED : STEEL;

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Animated.View style={iconStyle}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d={tab.icon} />
        </Svg>
      </Animated.View>
      <Text style={[styles.label, { color }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F0F0F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  rail: { position: 'absolute', top: 0, height: 3, backgroundColor: RED },
  row: { flexDirection: 'row' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { fontSize: 11, fontWeight: '500' },
});
