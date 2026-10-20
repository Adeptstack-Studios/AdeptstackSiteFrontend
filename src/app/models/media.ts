export type MediaKind = 'IMAGE' | 'VIDEO' | 'INSTALLER' | 'OTHER';

/** Where an upload is used; link is the console page of it. */
export interface MediaUse {
  type: 'APP' | 'RELEASE' | 'POST' | 'REVIEW';
  label: string;
  link: string | null;
}

export interface MediaFile {
  /** below the upload folder, e.g. "abc.png" or "4f…/Setup.exe" */
  path: string;
  url: string;
  kind: MediaKind;
  size: number;
  uploadedAt: string;
  uses: MediaUse[];
}

export interface MediaCleanup {
  deleted: number;
  bytes: number;
}

/** the backend leaves unused files of the last day alone: they may belong to an editor that isn't saved yet */
export const FRESH_MS = 24 * 60 * 60 * 1000;

export const USE_LABELS: Record<MediaUse['type'], string> = {
  APP: 'Store listing',
  RELEASE: 'Release',
  POST: 'Post',
  REVIEW: 'In review',
};

export function readableSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(?=.+\.)/i;

/** the name to show: the file name, without the random part older uploads put before the original name */
export function fileName(path: string) {
  return path.substring(path.lastIndexOf('/') + 1).replace(UUID_PREFIX, '');
}
