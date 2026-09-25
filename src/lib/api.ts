import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Points at the Django dev server. Resolution order:
 * 1. A real device running via Expo Go over the LAN has its own IP baked
 *    into Expo's dev-server address (`hostUri`, e.g. "192.168.1.5:8081") —
 *    reuse that host so this works on a phone with zero manual config,
 *    regardless of what network you're on.
 * 2. Otherwise fall back to platform defaults: Android emulators can't
 *    reach the host machine via `localhost` (need the special 10.0.2.2
 *    alias); iOS simulator and web both resolve `localhost` fine.
 */
function resolveDevHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_BASE_URL = `http://${resolveDevHost()}:8000/api/v1`;

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiPost<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let json: ApiEnvelope<T> | { message?: string } | null = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON error body (e.g. network gateway page) — fall through to status text
  }

  if (!response.ok) {
    const message = (json && 'message' in json && json.message) || response.statusText || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return (json as ApiEnvelope<T>).data;
}
