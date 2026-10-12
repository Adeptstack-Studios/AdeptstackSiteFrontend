import {Component, inject, input, signal} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ImageUp, LucideAngularModule} from 'lucide-angular';
import {FileService} from '../../services/file-service';
import {ToastService} from '../../services/toast-service';
import {IMAGE_FILE_HINT, isImageFile} from '../listing/upload-files';

/** The cover image of a release or post: upload, replace, remove. */
@Component({
  selector: 'app-cover-card',
  imports: [LucideAngularModule],
  template: `
    <section class="c-card" aria-labelledby="cover-heading">
      <div class="c-card-head"><h2 id="cover-heading">Cover image</h2></div>
      @if (control().value; as cover) {
        <div class="cover">
          <!-- a broken link shows the buttons only, not the alt text -->
          <img [src]="cover" alt="Cover image" (error)="$any($event.target).hidden = true">
          <div class="actions">
            <label class="c-btn c-btn-sm">
              {{ uploading() ? 'Uploading…' : 'Replace' }}
              <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="upload($event)">
            </label>
            <button type="button" class="c-btn c-btn-sm" (click)="remove()">Remove</button>
          </div>
        </div>
      } @else {
        <label class="drop">
          <lucide-icon [img]="icons.ImageUp" [size]="22" aria-hidden="true"></lucide-icon>
          {{ uploading() ? 'Uploading…' : 'Choose an image' }}
          <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="upload($event)">
        </label>
      }
      <p class="c-hint">{{ hint() }}</p>
    </section>
  `,
  styles: `
    .drop {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 26px 12px;
      border: 1px dashed var(--line-strong);
      border-radius: var(--radius-sm);
      color: var(--muted);
      cursor: pointer;
    }

    .drop:hover,
    .drop:focus-within {
      border-color: var(--accent);
      color: var(--text);
    }

    .cover img {
      display: block;
      width: 100%;
      max-height: 180px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      background: var(--panel-2);
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .actions label {
      position: relative;
    }
  `
})
export class CoverCard {
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);

  readonly control = input.required<FormControl<string>>();
  readonly hint = input('Also used for link previews (Discord, WhatsApp, …)');

  protected readonly icons = {ImageUp};
  protected readonly uploading = signal(false);

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
      next: response => {
        this.control().setValue(response.url);
        this.control().markAsDirty();
        this.uploading.set(false);
        this.toast.success('Cover image uploaded.');
      },
      error: () => this.uploading.set(false),
    });
  }

  protected remove() {
    this.control().setValue('');
    this.control().markAsDirty();
  }
}
