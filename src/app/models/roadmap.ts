export type RoadmapStatus = 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'PLANNED' | 'COMING_SOON' | 'LIVE';

/** One release or post on the roadmap; for a submitted plan the submitted times. */
export interface RoadmapItem {
  kind: 'RELEASE' | 'POST';
  id: number;
  appId: number | null;
  appName: string | null;
  appSlug: string | null;
  appIconUrl: string | null;
  title: string;
  version: string | null;
  channel: string | null;
  /** when it is (or was) out */
  at: string;
  status: RoadmapStatus;
  visibility: string;
  /** carried out automatically by an approved or submitted plan */
  planned: boolean;
  comingSoonAt: string | null;
  comingSoonPush: string | null;
  comingSoonPushedAt: string | null;
  /** the push at release (posts: at publishing) */
  push: string | null;
  pushedAt: string | null;
  approvedBy: string | null;
  reviewId: number | null;
}

export const ROADMAP_STATUS: Record<RoadmapStatus, { label: string; tone: 'off' | 'accent' | 'warn' | 'good' | 'beta' }> = {
  DRAFT: {label: 'Draft', tone: 'off'},
  IN_REVIEW: {label: 'In review', tone: 'accent'},
  CHANGES_REQUESTED: {label: 'Changes requested', tone: 'warn'},
  PLANNED: {label: 'Planned', tone: 'accent'},
  COMING_SOON: {label: 'Coming soon', tone: 'beta'},
  LIVE: {label: 'Live', tone: 'good'},
};

/** Where an entry is edited. */
export function roadmapLink(item: RoadmapItem): unknown[] {
  return item.kind === 'RELEASE' ? ['/apps', item.appSlug, 'releases', item.id] : ['/blog', item.id];
}
