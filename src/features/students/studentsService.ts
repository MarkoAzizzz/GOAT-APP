import { apiGet, apiPost } from '../../lib/api';

export type Student = {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  sport: 'boxing' | 'kickboxing';
  /** Open-ended ELO-style rating, starts at 1000. No ceiling. */
  rating: string;
  branch: string;
  branch_name: string;
  join_date: string;
  is_active: boolean;
  profile_photo: string | null;
  last_assessment_date: string | null;
  created_at: string;
};

export type Branch = {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
};

export type CreateStudentPayload = {
  full_name: string;
  email: string;
  password: string;
  sport: 'boxing' | 'kickboxing';
  branch: string;
  join_date: string;
};

export type AssessmentHistoryEntry = {
  id: string;
  assessment_date: string;
  /** Legacy 0-10 / percentage pair — null on points-based sessions. */
  overall_score: string | null;
  grade_percentage: string | null;
  /** Points-based: this session's net point change. Null on legacy sessions. */
  net_delta: string | null;
  rating_before: string | null;
  rating_after: string | null;
  coach_notes: string | null;
  action_plan: string | null;
  sessions_completed: number;
};

export type PillarScoreEntry = {
  pillar__name: string;
  pillar__order: number;
  /** Legacy absolute score — null on points-based rows. */
  score: string | null;
  delta: string | null;
  standing_before: string | null;
  standing_after: string | null;
};

export type StudentProgress = {
  current_rating: number | null;
  rating_change: number | null;
  highest_rating: number | null;
  lowest_rating: number | null;
  average_rating: number | null;
  total_assessments: number;
  latest_pillar_scores: PillarScoreEntry[];
  history: AssessmentHistoryEntry[];
};

export function getStudents(accessToken: string): Promise<Student[]> {
  return apiGet<Student[]>('/students/', accessToken);
}

export function getStudent(accessToken: string, id: string): Promise<Student> {
  return apiGet<Student>(`/students/${id}/`, accessToken);
}

export function getStudentProgress(accessToken: string, id: string): Promise<StudentProgress> {
  return apiGet<StudentProgress>(`/students/${id}/progress/`, accessToken);
}

/** The logged-in student's own profile. The student app enters through this
 * rather than /students/ — a student has no permission to list or look up
 * anyone else, so this is the only way they can resolve their own id. */
export function getMyStudentProfile(accessToken: string): Promise<Student> {
  return apiGet<Student>('/students/me/', accessToken);
}

export function getBranches(accessToken: string): Promise<Branch[]> {
  return apiGet<Branch[]>('/students/branches/', accessToken);
}

export function createStudent(accessToken: string, payload: CreateStudentPayload): Promise<Student> {
  return apiPost<Student>('/students/', payload, accessToken);
}
