import { apiGet, apiPost } from '../../lib/api';

export type Criterion = {
  id: string;
  name: string;
  description: string;
  order: number;
  is_sport_specific: boolean;
};

export type Pillar = {
  id: string;
  name: string;
  order: number;
  criteria: Criterion[];
};

export type AssessmentTemplate = {
  id: string;
  version: number;
  name: string;
  pillars: Pillar[];
};

export type CoachEntryScoreInput = {
  criterion_id: string;
  // -3..+3: how much better/worse this criterion looked this session, applied
  // on top of its running standing — not an absolute 0-10 score.
  delta: number;
  comment: string;
};

export type SubmitCoachEntryPayload = {
  student: string;
  assessment_date: string;
  sessions_completed: number;
  notes: string;
  action_plan: string;
  scores: CoachEntryScoreInput[];
};

export type CoachEntry = {
  id: string;
  student: string;
  student_id: string;
  student_name: string;
  coach_name: string;
  assessment_date: string;
  sessions_completed: number;
  notes: string;
  action_plan: string;
  scores: CoachEntryScoreInput[];
  submitted_at: string;
};

export function getAssessmentTemplate(accessToken: string): Promise<AssessmentTemplate> {
  return apiGet<AssessmentTemplate>('/assessments/template/', accessToken);
}

// Scores are submitted as a CoachEntry, not written directly into
// AssessmentSession/CriterionScore — the backend averages every coach's
// entries for that (student, date) and recalculates the session from that,
// which is also what refreshes the leaderboard immediately.
export function submitCoachEntry(accessToken: string, payload: SubmitCoachEntryPayload): Promise<unknown> {
  return apiPost('/assessments/coach-entries/', payload, accessToken);
}

// Lets the score screen pre-fill from today's entry instead of clobbering
// it — the backend keys CoachEntry on (student, coach, date), so submitting
// again today silently overwrites rather than creating a second entry.
export function getCoachEntries(accessToken: string, studentId: string, date: string): Promise<CoachEntry[]> {
  return apiGet<CoachEntry[]>('/assessments/coach-entries/', accessToken, { student: studentId, date });
}

export type AssessmentCriterionScore = {
  id: string;
  criterion_name: string;
  pillar_name: string;
  pillar_order: number;
  criterion_order: number;
  effective_score: string | null;
  delta: string | null;
  coach_comment: string;
};

export type AssessmentPillarScore = {
  pillar_name: string;
  pillar_order: number;
  score: string | null;
  delta: string | null;
  standing_before: string | null;
  standing_after: string | null;
};

export type AssessmentDetail = {
  id: string;
  student_id: string;
  student_name: string;
  assessment_date: string;
  martial_art: string;
  sessions_completed: number;
  net_delta: string | null;
  rating_before: string | null;
  rating_after: string | null;
  coach_notes: string;
  action_plan: string;
  pillar_scores: AssessmentPillarScore[];
  criterion_scores: AssessmentCriterionScore[];
  created_at: string;
};

// Full record of one past assessment: every criterion's delta plus each
// pillar's standing before/after, which is what the detail screen renders.
export function getAssessment(accessToken: string, assessmentId: string): Promise<AssessmentDetail> {
  return apiGet<AssessmentDetail>(`/assessments/${assessmentId}/`, accessToken);
}

export type MostImprovedEntry = {
  student_id: string;
  student_name: string;
  /** current rating - the 1000 baseline every student starts at. */
  gain: number;
};

export type PillarStrength = {
  pillar_name: string;
  /** Average standing across each rated student's latest assessment. Null
   * if nobody in this sport has a points-based pillar score yet. */
  average: number | null;
};

export type SportAnalytics = {
  total_members: number;
  assessed_this_month: number;
  average_rating: number | null;
  average_lifetime_gain: number | null;
  most_improved: MostImprovedEntry[];
  pillar_strength: PillarStrength[];
};

export type SportAnalyticsResponse = {
  boxing: SportAnalytics;
  kickboxing: SportAnalytics;
};

export function getSportAnalytics(accessToken: string): Promise<SportAnalyticsResponse> {
  return apiGet<SportAnalyticsResponse>('/assessments/analytics/', accessToken);
}
