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
}
