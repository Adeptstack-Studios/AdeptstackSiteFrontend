export type ReviewKind = 'RELEASE' | 'POST' | 'APP' | 'PUSH' | 'NEWSLETTER';
export type ReviewAction = 'UPDATE' | 'DELETE' | 'SEND';
export type ReviewStatus = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'WITHDRAWN';

/** A change waiting for (or past) an owner's approval. */
export interface ReviewSummary {
  id: number;
  kind: ReviewKind;
  action: ReviewAction;
  /** the release, post or app; for a new entry the private draft it was stored as */
  targetId: number | null;
  appId: number | null;
  title: string;
  status: ReviewStatus;
  author: string;
  submittedAt: string;
  reviewer: string | null;
  reviewedAt: string | null;
  comment: string | null;
  push: boolean;
  hints: number;
  /** went wrong after approving, e.g. the push */
  error: string | null;
}

/** Something the content check found; start and end point into the field's text. */
export interface ContentFinding {
  level: 'BLOCK' | 'HINT';
  field: string;
  match: string;
  start: number;
  end: number;
  excerpt: string;
  reason: string;
}

export interface ReviewDetail {
  review: ReviewSummary;
  /** what goes live, as the editor sent it */
  payload: Record<string, unknown> | null;
  /** what was live when it was submitted; private for an entry going live the first time */
  baseline: Record<string, unknown> | null;
  findings: ContentFinding[];
  canApprove: boolean;
  cannotApproveReason: string | null;
}

export interface ReviewCounts {
  pending: number;
  changesRequested: number;
}

export interface ContentRule {
  id: number;
  term: string;
  level: 'BLOCK' | 'HINT' | 'ALLOW';
  createdBy: string | null;
  createdAt: string | null;
}

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  WITHDRAWN: 'Withdrawn',
};

export const RULE_LEVELS: { level: ContentRule['level']; label: string; note: string }[] = [
  {level: 'BLOCK', label: 'Blocked', note: 'cannot be submitted'},
  {level: 'HINT', label: 'Hint', note: 'the reviewer sees it'},
  {level: 'ALLOW', label: 'Allowed', note: 'an exception, never flagged'},
];

/** "Publish", "Change", "Delete", "Push": what happens once it is approved. */
export function actionLabel(detail: Pick<ReviewDetail, 'review' | 'baseline' | 'payload'>): string {
  const {review, baseline, payload} = detail;
  if (review.action === 'DELETE') return 'Delete';
  if (review.kind === 'PUSH') return 'Push';
  if (review.kind === 'NEWSLETTER') return 'Newsletter';
  const before = String(baseline?.['visibility'] ?? 'PRIVATE').toUpperCase();
  const after = String(payload?.['visibility'] ?? before).toUpperCase();
  if (before === 'PRIVATE' && after !== 'PRIVATE') return 'Publish';
  if (before !== 'PRIVATE' && after === 'PRIVATE') return 'Take offline';
  return 'Change';
}

/** The submission behind a 202 answer of a save, delete or push. */
export function submittedReview(response: { status: number; body: unknown }): ReviewSummary | null {
  return response.status === 202 ? response.body as ReviewSummary : null;
}
