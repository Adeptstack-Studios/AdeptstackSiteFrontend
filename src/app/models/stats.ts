/** Sums over a range of days; nothing here belongs to a single person. */
export interface StatsTotals {
  views: number;
  /** visitors summed over the days: one person on two days counts twice */
  visitors: number;
  /** our own downloads */
  downloads: number;
  /** downloads by different visitors per day; far below downloads means someone helps the numbers */
  uniqueDownloads: number;
  /** clicks on store and web app links */
  storeClicks: number;
}

export interface StatsDay {
  /** yyyy-MM-dd */
  day: string;
  views: number;
  visitors: number;
  downloads: number;
  storeClicks: number;
  /** Modrinth + CurseForge downloads won that day, app statistics only */
  modDownloads: number;
}

export interface StatsShare {
  name: string;
  visitors: number;
}

/** "download" for our own file, otherwise e.g. "play-store" */
export interface StatsTarget {
  target: string;
  total: number;
  uniques: number;
}

/** GET /api/console/stats */
export interface StatsOverview {
  rangeDays: number;
  totals: StatsTotals;
  /** the same number of days right before, for the trend */
  previous: StatsTotals;
  days: StatsDay[];
  topPages: { path: string; views: number; visitors: number }[];
  /** os, browser, device, referrer, language */
  visitorsBy: Record<string, StatsShare[]>;
  targets: StatsTarget[];
}

/** GET /api/console/stats/apps/{slug} */
export interface AppStats {
  rangeDays: number;
  productPath: string;
  totals: StatsTotals;
  previous: StatsTotals;
  days: StatsDay[];
  targets: StatsTarget[];
  releases: { id: number; version: string; channel: string | null; downloads: number; uniqueDownloads: number; storeClicks: number }[];
  /** null when the app is no mod */
  modDownloadsGained: number | null;
}

/** GET /api/console/pushes */
export interface PushLogEntry {
  id: number;
  sentAt: string;
  kind: 'RELEASE' | 'POST';
  title: string;
  message: string | null;
  itemIds: number[];
  appIds: number[];
  sent: boolean;
  error: string | null;
  recipients: number | null;
  sentBy: string | null;
}

/** GET /api/console/newsletter */
export interface NewsletterStatus {
  signupOpen: boolean;
  confirmed: number;
  unconfirmed: number;
}

/** Readable names of the download targets */
export const TARGET_LABELS: Record<string, string> = {
  'download': 'Direct download',
  'web': 'Web app',
  'microsoft-store': 'Microsoft Store',
  'play-store': 'Play Store',
  'app-store': 'App Store',
  'steam': 'Steam',
  'modrinth': 'Modrinth',
  'curseforge': 'CurseForge',
};

/** +12 % against the range before; null when there is nothing to compare with */
export function trend(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round((current - previous) / previous * 100);
}
