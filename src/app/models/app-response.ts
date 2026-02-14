import {Changelogs} from './changelogs';

export class AppResponse {
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

  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  feature1Desc?: string;
  feature2Desc?: string;
  feature3Desc?: string;

  publishedAt?: Date;

  latestMainVersion?: Changelogs;
}
