import {Visibility} from '../shared/visibility-picker/visibility-picker';

/** A release in short, as the console endpoints list it. */
export interface ReleaseRef {
  id: number;
  version: string;
  title: string;
  channel: string;
  visibility: Visibility;
  /** yyyy-MM-dd */
  publishedAt: string | null;
  appId: number | null;
  appName: string | null;
  appSlug: string | null;
}

export interface AppChannel {
  name: string;
  count: number;
  /** The highest version in this channel, whatever its visibility. */
  latest: ReleaseRef;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

/** GET /api/console/apps: one app with its channels and store listing checklist. */
export interface AppSummary {
  id: number;
  name: string;
  slug: string;
  slogan: string | null;
  iconUrl: string | null;
  category: string | null;
  platforms: string | null;
  visibility: Visibility;
  /** Modrinth + CurseForge, null when the app is no mod */
  downloads: number | null;
  downloadsFormatted: string | null;
  releaseCount: number;
  draftCount: number;
  lastReleaseAt: string | null;
  /** The busiest channel first */
  channels: AppChannel[];
  checklist: ChecklistItem[];
}

/** GET /api/console/overview */
export interface ConsoleOverview {
  rangeDays: number;
  apps: number;
  publicApps: number;
  releases: number;
  releasesInRange: number;
  posts: number;
  draftPosts: number;
  modDownloads: number | null;
  modDownloadsFormatted: string | null;
  latestReleases: ReleaseRef[];
  draftReleases: ReleaseRef[];
}

/** The newest link an app used for one download field, offered for the next release. */
export interface LinkSuggestion {
  field: LinkField;
  url: string;
  version: string;
  releaseId: number;
}

/** The download link fields of a release, in the order the editor shows them. */
export const LINK_FIELDS = [
  {field: 'appUrl', label: 'Direct download', hint: 'Installer or archive, uploaded here'},
  {field: 'saasUrl', label: 'Web app', hint: 'Shown as the "Visit" button'},
  {field: 'microsoftStoreUrl', label: 'Microsoft Store', hint: ''},
  {field: 'playStoreUrl', label: 'Play Store', hint: ''},
  {field: 'appStoreUrl', label: 'App Store', hint: ''},
  {field: 'steamUrl', label: 'Steam', hint: ''},
  {field: 'modrinthUrl', label: 'Modrinth', hint: ''},
  {field: 'curseforgeUrl', label: 'CurseForge', hint: ''},
] as const;

export type LinkField = typeof LINK_FIELDS[number]['field'];

/** Done items of a store listing checklist, e.g. 5 of 6. */
export function checklistDone(app: Pick<AppSummary, 'checklist'>) {
  return app.checklist.filter(item => item.done).length;
}
