export class News {
  id?: number;
  title?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  content?: string;
  /** Estimated by the backend from the content. */
  readingTimeMinutes?: number;
  publishedAt?: Date;
  visible?: boolean;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  /** The app this post is about, null for none. Sent on save to link or unlink. */
  appId?: number | null;
  appName?: string | null;
  appSlug?: string | null;
  /** the moment it is published (ISO); publishedAt is its day */
  publishAt?: string | null;
  /** PLANNED while an approved plan waits. Sent as true to submit a plan. */
  plan?: string | boolean | null;
  /** push title, null for no push */
  publishPush?: string | null;
}
