import {Visibility} from '../shared/visibility-picker/visibility-picker';
import {ReviewKind, ReviewStatus} from './review';

/** GET /api/console/search: one release, post or open review of the command palette's search. */
export interface SearchHit {
  kind: 'RELEASE' | 'POST' | 'REVIEW';
  id: number;
  title: string;
  version: string | null;
  channel: string | null;
  category: string | null;
  appId: number | null;
  appSlug: string | null;
  appName: string | null;
  appIconUrl: string | null;
  visibility: Visibility | null;
  /** when it comes or came out; for a review when it was submitted */
  at: string | null;
  /** an approved plan waits for its time */
  planned: boolean;
  /** for a review: what it is about */
  target: ReviewKind | null;
  targetId: number | null;
  status: ReviewStatus | null;
  author: string | null;
}
