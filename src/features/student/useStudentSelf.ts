import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getMyStudentProfile,
  getStudentProgress,
  Student,
  StudentProgress,
  AssessmentHistoryEntry,
} from '../students/studentsService';
import { getLeaderboard, LeaderboardEntry } from '../leaderboard/leaderboardService';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Consecutive weeks the student has been assessed, counting back from their
 * most recent assessment.
 *
 * There's no attendance tracking in the backend, so this measures *weeks
 * assessed*, not sessions attended. The streak breaks if more than one week
 * passes between assessments, and is counted from the latest assessment
 * rather than today — so it doesn't silently reset to 0 the moment a week
 * ticks over before the coach has scored anyone.
 */
export function deriveStreak(history: AssessmentHistoryEntry[]): number {
  if (history.length === 0) return 0;

  // One entry per ISO-ish week bucket, newest first, de-duplicated: two
  // assessments in the same week are still one week of the streak.
  const weeks = Array.from(
    new Set(
      history.map((h) => Math.floor(new Date(h.assessment_date).getTime() / MS_PER_WEEK))
    )
  ).sort((a, b) => b - a);

  let streak = 1;
  for (let i = 1; i < weeks.length; i += 1) {
    if (weeks[i - 1] - weeks[i] === 1) streak += 1;
    else break;
  }
  return streak;
}

export type StudentSelf = {
  student: Student | null;
  progress: StudentProgress | null;
  /** This student's own leaderboard row — null if they've never been ranked. */
  entry: LeaderboardEntry | null;
  streak: number;
  loading: boolean;
  failed: boolean;
};

/**
 * Loads everything the student app needs about the signed-in student.
 * Leaderboard failures are tolerated — a student with no assessments yet
 * simply has no row, and that shouldn't blank the whole screen.
 */
export function useStudentSelf(): StudentSelf {
  const { accessToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    getMyStudentProfile(accessToken)
      .then(async (me) => {
        if (cancelled) return;
        setStudent(me);

        const [p, board] = await Promise.all([
          getStudentProgress(accessToken, me.id),
          getLeaderboard(accessToken).catch(() => [] as LeaderboardEntry[]),
        ]);
        if (cancelled) return;
        setProgress(p);
        setEntry(board.find((b) => b.student_uuid === me.id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return {
    student,
    progress,
    entry,
    streak: deriveStreak(progress?.history ?? []),
    loading,
    failed,
  };
}
