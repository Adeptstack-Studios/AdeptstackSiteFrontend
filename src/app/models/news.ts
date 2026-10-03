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
}
