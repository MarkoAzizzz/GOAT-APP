import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatRing } from '../components/StatRing';
import { PillarBars } from '../components/PillarBars';
import { Chip } from '../components/Chip';
import { GoatCard } from '../components/GoatCard';
import { GoatButton } from '../components/GoatButton';
import { LeaderboardRow } from '../components/LeaderboardRow';
import { GoatTabBar } from '../components/GoatTabBar';
import { DepthZoomStage } from '../components/DepthZoomStage';
import { useGoatTheme } from '../theme/ThemeProvider';

const PILLARS = [
  { label: 'power', value: 95 },
  { label: 'guard', value: 74 },
  { label: 'cond', value: 88 },
  { label: 'form', value: 62 },
  { label: 'ring iq', value: 80 },
];

function HomeTab() {
  return (
    <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
      <GoatCard delay={0} className="mb-4 items-center">
        <StatRing percent={82} label="advanced" />
        <View className="mt-4 w-full">
          <PillarBars pillars={PILLARS} />
        </View>
      </GoatCard>
      <View className="mb-4 flex-row gap-2">
        <Chip label="advanced" tone="amber" delay={100} />
        <Chip label="+14 this month" tone="green" delay={180} />
        <Chip label="week 14" tone="neutral" delay={260} />
      </View>
      <GoatCard delay={80} className="gap-3">
        <GoatButton label="save assessment" variant="primary" />
        <GoatButton label="view history" variant="ghost" />
      </GoatCard>
    </ScrollView>
  );
}

function ScoreTab() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <GoatCard delay={0} className="w-full items-center gap-2 py-8">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-goat-red">
          score
        </Text>
        <Text className="text-center text-[13px] text-goat-subtext">
          weekly assessment entry lands here next — pillar-by-pillar scoring for coaches.
        </Text>
      </GoatCard>
    </View>
  );
}

function BoardTab() {
  return (
    <View className="flex-1 px-4 pt-4">
      <GoatCard delay={0}>
        <Text className="mb-3 font-mono text-[10px] uppercase tracking-widest text-goat-subtext">
          this week
        </Text>
        <LeaderboardRow rank={1} name="amir k." score={94} />
        <LeaderboardRow rank={2} name="priya s." score={91} moved="up" />
        <LeaderboardRow rank={3} name="you" score={88} isSelf />
        <LeaderboardRow rank={4} name="devon r." score={85} />
      </GoatCard>
    </View>
  );
}

function BoxTab() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <GoatCard delay={0} className="w-full items-center gap-2 py-8">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-goat-red">box</Text>
        <Text className="text-center text-[13px] text-goat-subtext">
          your ai coach lands here next — chat, grounded in your real scores.
        </Text>
      </GoatCard>
    </View>
  );
}

const SCREENS: Record<string, React.ReactNode> = {
  home: <HomeTab />,
  score: <ScoreTab />,
  board: <BoardTab />,
  box: <BoxTab />,
};

export function ComponentPreviewScreen() {
  const { theme, toggleTheme } = useGoatTheme();
  const [tab, setTab] = useState('home');

  return (
    <SafeAreaView className="flex-1 bg-goat-bg">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-goat-red">
          goat · component library
        </Text>
        <Pressable
          onPress={toggleTheme}
          className="rounded-full border border-goat-overlay/15 px-3 py-1.5"
        >
          <Text className="text-[11px] font-bold uppercase text-goat-subtext">
            {theme === 'dark' ? 'dark' : 'light'}
          </Text>
        </Pressable>
      </View>

      <DepthZoomStage activeKey={tab} renderScreen={(key) => SCREENS[key]} />

      <View className="px-4 pb-2 pt-2">
        <GoatTabBar
          tabs={[
            { key: 'home', label: 'home' },
            { key: 'score', label: 'score' },
            { key: 'board', label: 'board' },
            { key: 'box', label: 'box' },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      </View>
    </SafeAreaView>
  );
}
