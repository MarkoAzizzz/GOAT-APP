import React, { useState } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { MotiView } from 'moti';

export type TabItem = { key: string; label: string };

type GoatTabBarProps = {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

/**
 * Bottom nav with a single red indicator that slides between tabs rather
 * than each tab fading independently — one continuous motion reads as more
 * deliberate than four icons blinking on and off.
 */
export function GoatTabBar({ tabs, activeKey, onChange }: GoatTabBarProps) {
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));

  const onLayout = (e: LayoutChangeEvent) => {
    setTabWidth(e.nativeEvent.layout.width / tabs.length);
  };

  return (
    <View
      onLayout={onLayout}
      className="flex-row rounded-2xl border border-goat-overlay/10 bg-goat-surface p-1"
    >
      {tabWidth > 0 && (
        <MotiView
          animate={{ translateX: activeIndex * tabWidth }}
          transition={{ type: 'spring', damping: 16, stiffness: 220 }}
          className="absolute bottom-1 left-1 top-1 rounded-xl bg-goat-red"
          style={{ width: tabWidth - 8 }}
        />
      )}
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} className="flex-1 items-center py-2.5">
            <Text
              className={`text-[11px] font-bold uppercase tracking-wide ${
                active ? 'text-white' : 'text-goat-subtext'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
