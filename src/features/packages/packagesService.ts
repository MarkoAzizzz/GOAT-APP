import { apiGet, apiPost, apiDelete } from '../../lib/api';

export type CheckInEntry = {
  id: string;
  checked_in_at: string;
  checked_in_by_name: string | null;
};

export type SessionPackage = {
  id: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  assigned_at: string;
  closed_at: string | null;
  check_ins: CheckInEntry[];
};

/** One row of the admin check-in roster. */
export type CheckInRow = {
  student_uuid: string;
  student_id: string;
  student_name: string;
  sport: 'boxing' | 'kickboxing';
  has_package: boolean;
  total_sessions: number | null;
  remaining_sessions: number | null;
  last_check_in_at: string | null;
};

export function getCheckInRoster(accessToken: string): Promise<CheckInRow[]> {
  return apiGet<CheckInRow[]>('/packages/check-in/', accessToken);
}

export function assignPackage(
  accessToken: string,
  studentUuid: string,
  totalSessions: 8 | 12
): Promise<SessionPackage> {
  return apiPost<SessionPackage>(
    `/packages/${studentUuid}/assign/`,
    { total_sessions: totalSessions },
    accessToken
  );
}

export function checkInStudent(accessToken: string, studentUuid: string): Promise<SessionPackage> {
  return apiPost<SessionPackage>(`/packages/${studentUuid}/check-in/`, {}, accessToken);
}

/** Undo: deleting the check-in row returns the session to the balance. */
export function undoCheckIn(
  accessToken: string,
  studentUuid: string,
  checkInId: string
): Promise<SessionPackage> {
  return apiDelete<SessionPackage>(
    `/packages/${studentUuid}/check-in/${checkInId}/`,
    accessToken
  );
}

/** The signed-in student's own balance — null when they've never had a package. */
export function getMyPackage(accessToken: string): Promise<SessionPackage | null> {
  return apiGet<SessionPackage | null>('/packages/me/', accessToken);
}

/** Every package the signed-in student has ever had, newest first. */
export function getMyPackageHistory(accessToken: string): Promise<SessionPackage[]> {
  return apiGet<SessionPackage[]>('/packages/me/history/', accessToken);
}

/** Admin lookup: every package a given student has ever had — works for
 * deactivated students too. */
export function getStudentPackageHistory(
  accessToken: string,
  studentUuid: string
): Promise<SessionPackage[]> {
  return apiGet<SessionPackage[]>(`/packages/${studentUuid}/history/`, accessToken);
}

/** Registering the same token again is a no-op server-side. */
export function registerPushToken(accessToken: string, token: string): Promise<unknown> {
  return apiPost('/packages/push-token/', { token }, accessToken);
}
