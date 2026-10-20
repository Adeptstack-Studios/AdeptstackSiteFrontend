export class Changelogs {
  id?: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  appUrl?: string;
  microsoftStoreUrl?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  steamUrl?: string;
  curseforgeUrl?: string;
  modrinthUrl?: string;
  saasUrl?: string;
  content?: string;
  channel?: string;
  appId?: number;
  app?: string;
  version?: string;
  publishedAt?: Date;
  visible?: boolean;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  /** the moment it is out (ISO); publishedAt is its day */
  releaseAt?: string | null;
  /** coming soon until releaseAt: no download links for visitors */
  upcoming?: boolean;
  /** an approved plan the console carries out: PLANNED or COMING_SOON. Sent as true to submit a plan. */
  plan?: string | boolean | null;
  comingSoonAt?: string | null;
  /** push titles, null for no push */
  comingSoonPush?: string | null;
  releasePush?: string | null;
  /** also to the webhooks that send what is ticked in the editor */
  postToWebhooks?: boolean;
}
