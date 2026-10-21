/** A screenshot of an app; text is Markdown and makes it a feature too. */
export interface AppImage {
  url: string;
  text: string | null;
}

export class App {
  id?: number;
  name?: string;
  slogan?: string;
  description?: string;
  iconUrl?: string;
  slug?: string;
  category?: string;
  platforms?: string;
  highlighted?: boolean;
  legacy?: boolean;

  modrinthId?: string;
  curseforgeId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

  /** Screenshots in gallery order; one with a text is also a feature on the product page */
  images?: AppImage[];
  /** Optional uploaded video, shown first in the gallery */
  videoUrl?: string | null;
  /** behind the top of the product page; null means the first screenshot */
  backgroundUrl?: string | null;

  /** The first three screenshots again, for older clients */
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  feature1Desc?: string;
  feature2Desc?: string;
  feature3Desc?: string;
  publishedAt?: Date;
  visible?: boolean;

  /** a plan for a live listing, only in a request: live at this moment (ISO) … */
  planAt?: string | null;
  /** … or with this release of the app */
  planReleaseId?: number | null;
  /** the planned change this one replaces once approved */
  replacesPlan?: number | null;
}
