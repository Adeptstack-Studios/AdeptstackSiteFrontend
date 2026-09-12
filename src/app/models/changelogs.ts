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
}
