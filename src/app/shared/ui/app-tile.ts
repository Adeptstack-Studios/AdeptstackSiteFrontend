import {Component, computed, input, signal} from '@angular/core';

const TILE_COLORS = ['#2563EB', '#C2410C', '#7C3AED', '#0F766E', '#BE185D', '#0369A1', '#4D7C0F', '#B45309'];

/** The app icon, or its initials on a colour derived from the name when there is none. */
@Component({
  selector: 'app-tile',
  template: `
    @if (iconUrl() && !broken()) {
      <img [src]="iconUrl()" alt="" (error)="broken.set(true)">
    } @else {
      <span class="initials" [style.background]="color()">{{ initials() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      border-radius: calc(var(--tile-size, 32px) * .28);
      overflow: hidden;
    }

    img, .initials {
      width: 100%;
      height: 100%;
    }

    img {
      object-fit: cover;
      background: var(--panel-2);
    }

    .initials {
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 650;
      font-size: calc(var(--tile-size, 32px) * .38);
      letter-spacing: .02em;
    }
  `,
  host: {'[style.--tile-size.px]': 'size()', 'aria-hidden': 'true'}
})
export class AppTile {
  readonly name = input('');
  readonly iconUrl = input<string | null | undefined>(null);
  readonly size = input(32);

  protected readonly broken = signal(false);

  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/[\s-]+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.substring(0, 2) ?? '?').toUpperCase();
  });

  protected readonly color = computed(() => {
    let hash = 0;
    for (const char of this.name()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
  });
}
