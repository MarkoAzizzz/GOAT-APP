import Constants from 'expo-constants';

/**
 * Points at the Django dev server. Resolution order:
 * 1. A real device running via Expo Go over the LAN has its own IP baked
 *    into Expo's dev-server address (`hostUri`, e.g. "192.168.1.5:8081") —
 *    reuse that host so this works on a phone with zero manual config,
 *    regardless of what network you're on.
 * 2. Otherwise `localhost`, which covers a physical device tunnelled over
 *    USB (`adb reverse tcp:8000 tcp:8000`) as well as the iOS simulator
 *    and web. An Android *emulator* reached without a LAN hostUri would
 *    need the 10.0.2.2 alias instead, but emulators always expose a
 *    hostUri, so case 1 handles them.
 */
function resolveDevHost(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  return 'localhost';
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

async function handleResponse<T>(response: Response): Promise<T> {
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

/**
 * AuthContext registers its silent-refresh function here so api.ts (a plain
 * module, outside React) can retry a request once after a 401 instead of
 * every call site having to know about token refresh.
 */
type UnauthorizedHandler = () => Promise<string | null>;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

async function fetchWithRefresh(url: string, init: RequestInit, accessToken?: string): Promise<Response> {
  const withAuth = (token?: string): RequestInit => ({
    ...init,
    headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  const response = await fetch(url, withAuth(accessToken));
  if (response.status !== 401 || !accessToken || !unauthorizedHandler) {
    return response;
  }

  const newToken = await unauthorizedHandler();
  if (!newToken) return response;
  return fetch(url, withAuth(newToken));
}

export async function apiPost<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${path}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    accessToken
  );
  return handleResponse<T>(response);
}

export async function apiDelete<T>(path: string, accessToken?: string): Promise<T> {
  const response = await fetchWithRefresh(`${API_BASE_URL}${path}`, { method: 'DELETE' }, accessToken);
  return handleResponse<T>(response);
}

export async function apiGet<T>(
  path: string,
  accessToken?: string,
  params?: Record<string, string | undefined>
): Promise<T> {
  const query = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&')
    : '';
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${path}${query ? `?${query}` : ''}`,
    { method: 'GET' },
    accessToken
  );
  return handleResponse<T>(response);
}
