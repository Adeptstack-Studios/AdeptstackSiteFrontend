export class News {
  id?: number;
  title?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  content?: string;
  publishedAt?: Date;
  visible?: boolean;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
}
