import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AdminTabBar } from './AdminTabBar';
import { AdminHomeTab } from './AdminHomeTab';
import { TeamTab } from './TeamTab';
import { ScoreTab } from './ScoreTab';
import { BoardTab } from './BoardTab';
import { MoreTab } from './MoreTab';
import { ADMIN_TABS, AdminTabKey } from './adminTabIcons';
import { StudentProfileScreen } from '../students/StudentProfileScreen';
import { SignOutButton } from '../../components/SignOutButton';

const SLIDE_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

function renderTab(
  tab: AdminTabKey,
  goTo: (t: AdminTabKey) => void,
  onSelectStudent: (id: string) => void,
  scoreStudentId: string | null,
  onStartScoring: () => void,
  onScoreDirtyChange: (dirty: boolean) => void
) {
  switch (tab) {
    case 'home':
      return (
        <AdminHomeTab
          onStartScoring={onStartScoring}
          onOpenBoard={() => goTo('board')}
          onSelectStudent={onSelectStudent}
        />
      );
    case 'team':
      return <TeamTab onSelectStudent={onSelectStudent} />;
    case 'score':
      return (
        <ScoreTab
          initialStudentId={scoreStudentId}
          onExitToHome={() => goTo('home')}
          onDirtyChange={onScoreDirtyChange}
        />
      );
    case 'board':
      return <BoardTab onSelectStudent={onSelectStudent} />;
    case 'more':
      return <MoreTab />;
  }
}

/**
 * Post-login admin app shell: mascot watermark, direction-aware tab
 * content (slides in from the side you came from along the bar), and the
 * bottom tab bar.
 */
export function AdminShell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AdminTabKey>('home');
  const [renderKey, setRenderKey] = useState(0);
  const prevIndexRef = useRef(0);
  const [dir, setDir] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [scoreStudentId, setScoreStudentId] = useState<string | null>(null);
  const scoreDirtyRef = useRef(false);
  const [pendingLeaveScore, setPendingLeaveScore] = useState<AdminTabKey | null>(null);

  const goTo = (next: AdminTabKey) => {
    if (next === tab) return;
    const nextIndex = ADMIN_TABS.findIndex((t) => t.key === next);
    setDir(nextIndex >= prevIndexRef.current ? 1 : -1);
    prevIndexRef.current = nextIndex;
    setTab(next);
    setRenderKey((k) => k + 1);
  };

  // "Start scoring" from Home has no student in mind — always starts at the
  // picker. A profile's "New assessment" preselects that specific student.
  const startScoring = () => {
    setScoreStudentId(null);
    goTo('score');
  };

  const startAssessmentFor = (studentId: string) => {
    setScoreStudentId(studentId);
    setSelectedStudentId(null);
    goTo('score');
  };

  // Tapping the Score icon in the tab bar is a fresh visit, not a resumed
  // "New assessment" hand-off — without this, a preselected student from an
  // earlier profile visit would silently stick around on every later tap.
  const handleTabBarChange = (next: AdminTabKey) => {
    if (tab === 'score' && next === 'home' && scoreDirtyRef.current) {
      setPendingLeaveScore(next);
      return;
    }
    if (next === 'score') setScoreStudentId(null);
    goTo(next);
  };

  if (selectedStudentId) {
    return (
      <StudentProfileScreen
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
        onNewAssessment={startAssessmentFor}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <MotiView
          key={renderKey}
          from={{ opacity: 0.3, translateX: dir * 40 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 360, easing: SLIDE_EASING }}
          style={{ flex: 1 }}
        >
          {renderTab(tab, goTo, setSelectedStudentId, scoreStudentId, startScoring, (dirty) => {
            scoreDirtyRef.current = dirty;
          })}
        </MotiView>
      </View>

      <SignOutButton />

      <AdminTabBar activeKey={tab} onChange={handleTabBarChange} />

      <ConfirmModal
        visible={pendingLeaveScore !== null}
        title="Discard this assessment?"
        message="Scores you've entered so far will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          const next = pendingLeaveScore;
          setPendingLeaveScore(null);
          if (next) goTo(next);
        }}
        onCancel={() => setPendingLeaveScore(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent — the shared mascot backdrop is mounted once at
  // RootAuthScreen and sits underneath this in z-order. An opaque
  // background here would hide it entirely.
  root: { flex: 1 },
  content: { flex: 1, paddingBottom: 92 },
});
