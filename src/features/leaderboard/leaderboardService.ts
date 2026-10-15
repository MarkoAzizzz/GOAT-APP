import { apiGet } from '../../lib/api';

export type LeaderboardEntry = {
  student_uuid: string;
  student_id: string;
  student_name: string;
  sport: 'boxing' | 'kickboxing';
  profile_photo: string | null;
  /** Open-ended ELO-style rating, starts at 1000. No ceiling. */
  current_rating: string | null;
  previous_rating: string | null;
  /** current_rating - previous_rating for the latest session. */
  rating_change: string | null;
  total_assessments: number;
  /** Board position by score, 1 = top. Null until ranks have been computed. */
  rank: number | null;
  /** Position before the last recompute; `previous_rank - rank` is the movement. */
  previous_rank: number | null;
};

export function getLeaderboard(
  accessToken: string,
  filters?: { branch?: string; sport?: string }
): Promise<LeaderboardEntry[]> {
  return apiGet<LeaderboardEntry[]>('/leaderboard/', accessToken, filters);
}
