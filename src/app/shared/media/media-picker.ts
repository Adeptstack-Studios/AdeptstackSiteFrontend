import {Component, computed, inject, Injectable, signal} from '@angular/core';
import {Dialog, DialogRef} from '@angular/cdk/dialog';
import {firstValueFrom} from 'rxjs';
import {ImageUp, LucideAngularModule, Search, X} from 'lucide-angular';
import {FileService} from '../../services/file-service';
import {ToastService} from '../../services/toast-service';
import {IMAGE_FILE_HINT, isImageFile} from '../listing/upload-files';
import {fileName, MediaFile, USE_LABELS} from '../../models/media';

/** The uploaded images to choose from, or a new one; closes with the address of the image. */
@Component({
  selector: 'app-media-picker',
  imports: [LucideAngularModule],
  template: `
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div class="head">
        <h2 id="picker-title">Choose an image</h2>
        <button type="button" class="close" (click)="ref.close()" aria-label="Close">
          <lucide-icon [img]="icons.X" [size]="18" aria-hidden="true"></lucide-icon>
        </button>
      </div>

      <div class="bar">
        <label class="c-search">
          <lucide-icon [img]="icons.Search" [size]="15" aria-hidden="true"></lucide-icon>
          <span class="sr-only">Search images</span>
          <input class="c-input" type="search" placeholder="Search by name or where it's used" cdkFocusInitial
                 [value]="query()" (input)="query.set($any($event.target).value)">
        </label>
        <label class="c-btn c-btn-sm">
          <lucide-icon [img]="icons.ImageUp" [size]="14" aria-hidden="true"></lucide-icon>
          {{ uploading() ? 'Uploading…' : 'Upload new' }}
          <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="upload($event)"
                 [disabled]="uploading()">
        </label>
      </div>

      <div class="body">
        @if (images(); as list) {
          @if (shown().length) {
            <ul class="grid">
              @for (image of shown(); track image.path) {
                <li>
                  <button type="button" class="tile" (click)="ref.close(image.url)" [attr.aria-label]="'Use ' + name(image)">
                    <img [src]="image.url" alt="" loading="lazy">
                    <span class="name">{{ name(image) }}</span>
                    <span class="use">{{ useOf(image) }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="c-empty">{{ list.length ? 'No image matches.' : 'No images uploaded yet.' }}</p>
          }
        } @else {
          <ul class="grid" aria-hidden="true">
            @for (n of [1, 2, 3, 4, 5, 6]; track n) { <li class="c-skeleton ghost"></li> }
          </ul>
        }
      </div>
    </div>
  `,
  styles: `
    .dialog {
      width: min(860px, calc(100vw - 32px));
      max-height: min(720px, calc(100vh - 48px));
      display: flex;
      flex-direction: column;
      background: var(--panel);
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
    }

    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px 0;
    }

    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 650;
    }

    .close {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 8px;
      background: none;
      color: var(--muted);
      cursor: pointer;
    }

    .close:hover {
      background: var(--panel-2);
      color: var(--text);
    }

    .bar {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid var(--line);
    }

    .bar .c-search {
      flex: 1;
      width: auto;
    }

    .bar label.c-btn {
      position: relative;
      cursor: pointer;
    }

    .body {
      overflow-y: auto;
      padding: 16px 20px 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .ghost {
      height: 150px;
    }

    .tile {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 6px 8px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--panel);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }

    .tile:hover,
    .tile:focus-visible {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .tile img {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: contain;
      border-radius: 6px;
      background: var(--panel-2);
    }

    .name,
    .use {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }

    .name {
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .use {
      color: var(--muted);
      font-size: 12px;
    }

    @media (max-width: 520px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `
})
export class MediaPicker {
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);

  protected readonly icons = {ImageUp, Search, X};
  protected readonly images = signal<MediaFile[] | null>(null);
  protected readonly query = signal('');
  protected readonly uploading = signal(false);

  protected readonly shown = computed(() => {
    const query = this.query().trim().toLowerCase();
    const list = this.images() ?? [];
    if (!query) return list;
    return list.filter(image => image.path.toLowerCase().includes(query)
      || image.uses.some(use => use.label.toLowerCase().includes(query)));
  });

  constructor() {
    this.files.list().subscribe({
      next: list => this.images.set(list.filter(file => file.kind === 'IMAGE')),
      error: () => this.images.set([]),
    });
  }

  protected name(image: MediaFile) {
    return fileName(image.path);
  }

  protected useOf(image: MediaFile) {
    const first = image.uses[0];
    if (!first) return 'Unused';
    const more = image.uses.length > 1 ? ` +${image.uses.length - 1}` : '';
    return `${USE_LABELS[first.type]} · ${first.label}${more}`;
  }

  protected upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.uploading.set(true);
    this.files.uploadImage(file).subscribe({
      next: response => this.ref.close(response.url),
      error: () => this.uploading.set(false),
    });
  }
}

/** `const url = await picker.pick()`: the chosen image, or null when closed. */
@Injectable({providedIn: 'root'})
export class MediaPickerService {
  private readonly dialog = inject(Dialog);

  async pick(): Promise<string | null> {
    const ref = this.dialog.open<string>(MediaPicker, {backdropClass: 'confirm-backdrop'});
    return (await firstValueFrom(ref.closed)) ?? null;
  }
}
