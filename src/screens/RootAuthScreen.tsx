import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { GoatMascotBackdrop } from '../components/GoatMascotBackdrop';
import { LoginPanel } from '../features/auth/LoginPanel';
import { AdminShell } from '../features/admin/AdminShell';
import { AdminWelcomePanel } from '../features/auth/AdminWelcomePanel';
import { StudentWelcomePanel } from '../features/auth/StudentWelcomePanel';
import { StudentShell } from '../features/student/StudentShell';
import { useAuth } from '../features/auth/AuthContext';

type Phase = 'login' | 'exiting' | 'welcome';

/**
 * Owns the "zoom through" hand-off between the login form and the
 * post-login panel. The mascot backdrop is mounted once, above both
 * panels, and never touched by this transition — it's the fixed anchor
 * the whole move happens around, per the confirmed design.
 */
export function RootAuthScreen() {
  const { status, user } = useAuth();
  // Reopening the app with a stored session skips straight to the welcome
  // panel, already settled — no replaying the login entrance/transition.
  const [phase, setPhase] = useState<Phase>(() => (status === 'signedIn' ? 'welcome' : 'login'));
  const [adminIntroSeen, setAdminIntroSeen] = useState(false);
  // Reopening the app with a stored session is a resume, not a login, so the
  // stats intro is already "seen" and the shell takes over immediately. A
  // fresh sign-in starts false and plays it.
  const [studentIntroSeen, setStudentIntroSeen] = useState(status === 'signedIn');
  const formProgress = useSharedValue(status === 'signedIn' ? 1 : 0);
  // The plate is only a brief cut to hide the ugly mid-zoom moment — it must
  // fade back out afterward, or it permanently blacks out the mascot (which
  // is supposed to stay visible, continuous, behind the welcome panel too).
  const plateOpacity = useSharedValue(0);
  const welcomeProgress = useSharedValue(status === 'signedIn' ? 1 : 0);

  // Logging out flips status back to 'signedOut' from anywhere in the app —
  // reset the transition values and hand the screen back to the login form.
  useEffect(() => {
    if (status === 'signedOut' && phase !== 'login') {
      formProgress.value = 0;
      plateOpacity.value = 0;
      welcomeProgress.value = 0;
      setPhase('login');
      setAdminIntroSeen(false);
      setStudentIntroSeen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const beginTransition = () => {
    setPhase('exiting');
    formProgress.value = withTiming(1, { duration: 300, easing: Easing.bezier(0.5, 0.02, 0.42, 1) });
    plateOpacity.value = withDelay(
      170,
      withTiming(1, { duration: 120, easing: Easing.linear }, (finished) => {
        if (finished) {
          plateOpacity.value = withDelay(360, withTiming(0, { duration: 200, easing: Easing.linear }));
        }
      })
    );
    welcomeProgress.value = withDelay(
      220,
      withTiming(1, { duration: 360, easing: Easing.bezier(0.16, 0.84, 0.44, 1) }, (finished) => {
        if (finished) runOnJS(setPhase)('welcome');
      })
    );
  };

  const formStyle = useAnimatedStyle(() => ({
    opacity: 1 - formProgress.value,
    transform: [{ scale: 1 + formProgress.value * 0.85 }],
  }));
  const plateStyle = useAnimatedStyle(() => ({ opacity: plateOpacity.value }));
  const welcomeStyle = useAnimatedStyle(() => ({
    opacity: welcomeProgress.value,
    transform: [{ scale: 0.82 + welcomeProgress.value * 0.18 }],
  }));

  // The admin tab shell is a much longer-lived, denser screen than the
  // brief login/welcome moment, so its watermark sits dimmer once it takes
  // over — same shared mascot instance, just retargeted, never remounted.
  const inShell =
    phase === 'welcome' &&
    ((user?.role === 'admin' && adminIntroSeen) || (user?.role === 'student' && studentIntroSeen));
  const mascotOpacity = inShell ? 0.12 : 0.28;

  return (
    <View style={styles.root}>
      <GoatMascotBackdrop restOpacity={mascotOpacity} />

      {phase !== 'welcome' && (
        <Animated.View style={[StyleSheet.absoluteFill, formStyle]}>
          <LoginPanel onSuccess={beginTransition} />
        </Animated.View>
      )}

      {phase !== 'login' && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.plate, plateStyle]} />
      )}

      {phase !== 'login' && (
        <Animated.View style={[StyleSheet.absoluteFill, welcomeStyle]}>
          {user?.role === 'student' ? (
            studentIntroSeen ? (
              <StudentShell />
            ) : (
              <StudentWelcomePanel onContinue={() => setStudentIntroSeen(true)} />
            )
          ) : adminIntroSeen ? (
            <AdminShell />
          ) : (
            <AdminWelcomePanel onContinue={() => setAdminIntroSeen(true)} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  plate: { backgroundColor: '#050505' },
});
