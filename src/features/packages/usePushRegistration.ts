import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../auth/AuthContext';
import { registerPushToken } from './packagesService';

/**
 * A notification arriving while the user is already looking at the app reads
 * as a glitch, so nothing is shown in the foreground — the Home banner
 * already covers that case. Banner and sound are for when the app is closed.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push on login.
 *
 * Expo Go on Android cannot receive push from SDK 53 onward, so this is a
 * no-op there rather than prompting for a permission that can never deliver
 * anything. A development or production build registers normally.
 *
 * Failures are deliberately silent: push is an extra, and a student whose
 * device can't register must still be able to use the app.
 */
export function usePushRegistration() {
  const { accessToken, status } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn' || !accessToken) return;

    // Expo Go reports 'expo'; a real build reports 'standalone' or similar.
    const inExpoGo = Constants.appOwnership === 'expo';
    if (inExpoGo && Platform.OS === 'android') return;

    let cancelled = false;

    (async () => {
      try {
        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted && existing.canAskAgain) {
          const asked = await Notifications.requestPermissionsAsync();
          granted = asked.granted;
        }
        if (!granted || cancelled) {
          if (__DEV__) console.warn('[push] not registering — permission not granted', existing);
          return;
        }

        if (Platform.OS === 'android') {
          // Android needs a channel before anything will display.
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Session packages',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#E11919',
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          if (__DEV__) console.warn('[push] not registering — no eas projectId found');
          return;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!token || cancelled) {
          if (__DEV__) console.warn('[push] getExpoPushTokenAsync returned no token');
          return;
        }

        if (__DEV__) console.warn('[push] got token, registering with backend:', token);
        await registerPushToken(accessToken, token);
        if (__DEV__) console.warn('[push] registered successfully');
      } catch (e) {
        // Push is best-effort; never block the app on it.
        if (__DEV__) console.warn('[push] registration threw:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, status]);
}
