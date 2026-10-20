import {Component, ElementRef, inject, input, signal, viewChild} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MarkdownComponent} from 'ngx-markdown';
import {ImagePlus, Images, LucideAngularModule} from 'lucide-angular';
import {FileService} from '../../services/file-service';
import {ToastService} from '../../services/toast-service';
import {IMAGE_FILE_HINT, isImageFile} from '../listing/upload-files';
import {MediaPickerService} from '../media/media-picker';

/**
 * Markdown on the left, the rendered preview on the right; one above the other on narrow screens.
 * Images go in by the toolbar, by dropping them on the text or by pasting them, e.g. a screenshot.
 */
@Component({
  selector: 'app-markdown-editor',
  imports: [ReactiveFormsModule, MarkdownComponent, LucideAngularModule],
  template: `
    @if (control().enabled) {
      <div class="tools">
        <label class="c-btn c-btn-sm">
          <lucide-icon [img]="icons.ImagePlus" [size]="14" aria-hidden="true"></lucide-icon>
          Upload image
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" (change)="chosen($event)">
        </label>
        <button type="button" class="c-btn c-btn-sm" (click)="fromLibrary()">
          <lucide-icon [img]="icons.Images" [size]="14" aria-hidden="true"></lucide-icon>
          From files
        </button>
        <span class="tools-hint" aria-live="polite">
          {{ uploading() ? 'Uploading ' + uploading() + (uploading() === 1 ? ' image…' : ' images…') : 'or drop or paste an image into the text' }}
        </span>
      </div>
    }
    <div class="split">
      <label class="sr-only" [for]="inputId()">{{ label() }}</label>
      <textarea #source [id]="inputId()" class="source" [class.dropping]="dropping()" [formControl]="control()"
                spellcheck="true" [placeholder]="placeholder()"
                (dragover)="dragOver($event)" (dragleave)="dropping.set(false)" (drop)="dropped($event)"
                (paste)="pasted($event)"></textarea>
      <div class="preview" aria-label="Preview">
        <span class="preview-label">Preview</span>
        <markdown [data]="control().value"></markdown>
      </div>
    </div>
  `,
  styles: `
    .tools {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 14px;
      border-bottom: 1px solid var(--line);
    }

    .tools label.c-btn {
      position: relative;
      cursor: pointer;
    }

    .tools-hint {
      color: var(--muted);
      font-size: 12.5px;
    }

    .split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-height: var(--editor-height, 380px);
    }

    .source {
      min-height: var(--editor-height, 380px);
      padding: 18px 20px;
      border: none;
      border-right: 1px solid var(--line);
      background: transparent;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.7;
      resize: vertical;
      outline: none;
    }

    .source:focus {
      background: var(--panel-2);
    }

    .source.dropping {
      background: var(--accent-soft);
      outline: 2px dashed var(--accent);
      outline-offset: -6px;
    }

    .preview {
      padding: 18px 20px;
      overflow-wrap: anywhere;
    }

    .preview-label {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .preview ::ng-deep h2 {
      margin: 14px 0 6px;
      font-size: 17px;
    }

    .preview ::ng-deep ul {
      margin: 0;
      padding-left: 20px;
    }

    .preview ::ng-deep img {
      max-width: 100%;
      border-radius: var(--radius-sm);
    }

    @media (max-width: 1100px) {
      .split {
        grid-template-columns: minmax(0, 1fr);
      }

      .source {
        border-right: none;
        border-bottom: 1px solid var(--line);
      }
    }
  `
})
export class MarkdownEditor {
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly picker = inject(MediaPickerService);

  readonly control = input.required<FormControl<string>>();
  readonly inputId = input('content');
  readonly label = input('Text in Markdown');
  readonly placeholder = input('');

  protected readonly icons = {ImagePlus, Images};
  protected readonly uploading = signal(0);
  protected readonly dropping = signal(false);
  private readonly source = viewChild.required<ElementRef<HTMLTextAreaElement>>('source');
  private uploads = 0;

  protected chosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.uploadAll(files);
  }

  protected async fromLibrary() {
    // the cursor is lost while the dialog has the focus
    const area = this.source().nativeElement;
    const selection = [area.selectionStart, area.selectionEnd] as const;
    const url = await this.picker.pick();
    if (!url) return;
    area.setSelectionRange(selection[0], selection[1]);
    this.insert(`![](${url})`);
  }

  protected dragOver(event: DragEvent) {
    if (!this.control().enabled || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dropping.set(true);
  }

  protected dropped(event: DragEvent) {
    this.dropping.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length || !this.control().enabled) return;
    event.preventDefault();
    this.uploadAll(files);
  }

  /** a pasted screenshot is uploaded; pasted text stays as it is */
  protected pasted(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile);
    if (!files.length || !this.control().enabled) return;
    event.preventDefault();
    this.uploadAll(files);
  }

  /** Each image gets a placeholder where the cursor is, replaced by the image once it is uploaded. */
  private uploadAll(files: File[]) {
    const images = files.filter(isImageFile);
    if (images.length < files.length) this.toast.error(IMAGE_FILE_HINT);
    for (const file of images) {
      const placeholder = `![Uploading ${file.name.replace(/[[\]]/g, '')} (${++this.uploads})…]()`;
      this.insert(placeholder);
      this.uploading.update(n => n + 1);
      this.files.uploadImage(file).subscribe({
        next: response => {
          this.replace(placeholder, `![${altOf(file.name)}](${response.url})`);
          this.uploading.update(n => n - 1);
        },
        error: () => {
          this.replace(placeholder, '');
          this.uploading.update(n => n - 1);
        },
      });
    }
  }

  /** As a paragraph of its own at the cursor, the cursor after it. */
  private insert(text: string) {
    const area = this.source().nativeElement;
    const value = this.control().value ?? '';
    const start = Math.min(area.selectionStart ?? value.length, value.length);
    const end = Math.min(area.selectionEnd ?? start, value.length);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    this.control().setValue(before + lead + text + trail + after);
    this.control().markAsDirty();
    const caret = (before + lead + text).length;
    area.focus();
    area.setSelectionRange(caret, caret);
  }

  /** the placeholder by the image; nothing happens when someone deleted it meanwhile */
  private replace(placeholder: string, text: string) {
    const value = this.control().value ?? '';
    const at = value.indexOf(placeholder);
    if (at < 0) return;
    const area = this.source().nativeElement;
    const focused = document.activeElement === area;
    const caret = area.selectionStart;
    let next = value.slice(0, at) + text + value.slice(at + placeholder.length);
    if (!text) next = next.replace(/\n{3,}/g, '\n\n');
    this.control().setValue(next);
    this.control().markAsDirty();
    // the cursor stays where it was, moved along when it was behind the image
    if (focused) {
      const moved = Math.min(next.length, caret > at ? caret + (text.length - placeholder.length) : caret);
      area.setSelectionRange(Math.max(0, moved), Math.max(0, moved));
    }
  }
}

/** "release-overview_2.png" → "release overview 2"; nothing for names like "image.png" from a paste */
function altOf(name: string) {
  const stem = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/[[\]]/g, '').trim();
  const generic = /^(screenshot|screen shot|bildschirmfoto|image|img|unnamed)\b/i.test(stem) || /^[\s\d().-]*$/.test(stem);
  return generic ? '' : stem;
}
