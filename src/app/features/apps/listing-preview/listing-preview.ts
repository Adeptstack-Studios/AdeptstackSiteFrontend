import {Component, computed, input} from '@angular/core';
import {MarkdownComponent} from 'ngx-markdown';
import {Download, LucideAngularModule, Play, TriangleAlert} from 'lucide-angular';

/** What the preview shows; the form value of the store listing. */
export interface ListingPreviewData {
  name: string;
  slogan: string;
  description: string;
  iconUrl: string;
  platforms: string;
  category: string;
  legacy: boolean;
  videoUrl: string;
  backgroundUrl: string;
  backgroundVideo: boolean;
  images: { url: string; text: string }[];
}

/**
 * The product page as adeptstack.net shows it, close enough to judge texts, order and images: the store
 * panel with icon, name and platforms beside screenshots (video first), description and features, like
 * the Microsoft Store. Always dark, like the website.
 */
@Component({
  selector: 'app-listing-preview',
  imports: [MarkdownComponent, LucideAngularModule],
  templateUrl: './listing-preview.html',
  styleUrl: './listing-preview.css'
})
export class ListingPreview {
  readonly listing = input.required<ListingPreviewData>();

  protected readonly icons = {Download, Play, TriangleAlert};
  protected readonly platforms = computed(() =>
    this.listing().platforms.split(/[,;]/).map(platform => platform.trim()).filter(Boolean));
  protected readonly features = computed(() => this.listing().images.filter(image => image.text.trim()));
  /** behind the top, like the website: the own image, else the first screenshot */
  protected readonly backdrop = computed(() => this.listing().backgroundUrl || this.listing().images[0]?.url || '');
}
