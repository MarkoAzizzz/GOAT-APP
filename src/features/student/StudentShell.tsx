import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { AdminTabBar } from '../admin/AdminTabBar';
import { ComingSoonTab } from '../admin/ComingSoonTab';
import { StudentHomeTab } from './StudentHomeTab';
import { StudentProgressTab } from './StudentProgressTab';
import { StudentBoardTab } from './StudentBoardTab';
import { StudentProfileTab } from './StudentProfileTab';
import { SignOutButton } from '../../components/SignOutButton';
import { STUDENT_TABS, StudentTabKey } from './studentTabIcons';
import { useStudentSelf } from './useStudentSelf';
import { usePushRegistration } from '../packages/usePushRegistration';

const SLIDE_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

/**
 * Post-intro student app shell. Only Home is built; the rest are placeholders
 * so the tab bar is navigable end to end while they're filled in.
 *
 * The student's own data is loaded once here and handed down, so switching
 * tabs doesn't re-fetch the profile on every move.
 */
export function StudentShell() {
  const insets = useSafeAreaInsets();
  const self = useStudentSelf();
  // Students are the only ones who receive package alerts, so the device is
  // registered here rather than at the app root.
  usePushRegistration();
  const [tab, setTab] = useState<StudentTabKey>('home');
  const [renderKey, setRenderKey] = useState(0);
  const prevIndexRef = useRef(0);
  const [dir, setDir] = useState(1);

  const goTo = (next: StudentTabKey) => {
    if (next === tab) return;
    const nextIndex = STUDENT_TABS.findIndex((t) => t.key === next);
    setDir(nextIndex >= prevIndexRef.current ? 1 : -1);
    prevIndexRef.current = nextIndex;
    setTab(next);
    setRenderKey((k) => k + 1);
  };

  const renderTab = () => {
    switch (tab) {
      case 'home':
        return <StudentHomeTab self={self} />;
      case 'progress':
        return <StudentProgressTab self={self} />;
      case 'board':
        return <StudentBoardTab self={self} />;
      case 'profile':
        return <StudentProfileTab self={self} />;
      case 'more':
        return <ComingSoonTab title="More" />;
    }
  };

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
          {renderTab()}
        </MotiView>
      </View>

      <SignOutButton />

      <AdminTabBar tabs={STUDENT_TABS} activeKey={tab} onChange={goTo} />
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
