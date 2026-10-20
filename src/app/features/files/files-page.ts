import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';
import {
  Copy, ExternalLink, File as FileIcon, Film, ImageIcon, Link, LucideAngularModule, Package, Search, Trash2, Upload
} from 'lucide-angular';
import {FileService} from '../../services/file-service';
import {ToastService} from '../../services/toast-service';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {CurrentUser} from '../../core/auth/current-user';
import {EditOnly} from '../../shared/ui/edit-only';
import {fileName, FRESH_MS, MediaFile, MediaKind, readableSize, USE_LABELS} from '../../models/media';
import {isImageFile, isInstallerFile, isVideoFile} from '../../shared/listing/upload-files';

type KindFilter = 'ALL' | MediaKind;
type UseFilter = 'ALL' | 'USED' | 'UNUSED';

const KINDS: { value: KindFilter; label: string }[] = [
  {value: 'ALL', label: 'All'},
  {value: 'IMAGE', label: 'Images'},
  {value: 'VIDEO', label: 'Videos'},
  {value: 'INSTALLER', label: 'Installers'},
];

/** Everything uploaded, where it is used, and the unused files to clear out. */
@Component({
  selector: 'app-files-page',
  imports: [LucideAngularModule, DatePipe, RouterLink, EditOnly],
  template: `
    <div class="c-scroll" (dragover)="dragOver($event)" (dragleave)="dragLeave($event)" (drop)="dropped($event)">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Files</h1>
            <p class="c-sub">
              @if (files(); as list) {
                {{ list.length }} {{ list.length === 1 ? 'file' : 'files' }} · {{ size(totalBytes()) }}
                @if (unused().length) { · {{ unused().length }} unused ({{ size(unusedBytes()) }}) }
              } @else {
                Loading files…
              }
            </p>
          </div>
          <div class="c-actions">
            @if (currentUser.isOwner() && clearable().length) {
              <button type="button" class="c-btn" (click)="deleteUnused()" [disabled]="busy()">
                <lucide-icon [img]="icons.Trash2" [size]="16" aria-hidden="true"></lucide-icon>
                Delete {{ clearable().length }} unused
              </button>
            }
            <label appEditOnly class="c-btn c-btn-primary upload">
              <lucide-icon [img]="icons.Upload" [size]="16" aria-hidden="true"></lucide-icon>
              {{ uploading() ? 'Uploading ' + uploading() + '…' : 'Upload' }}
              <input type="file" multiple class="sr-only" (change)="chosen($event)"
                     accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,.exe,.msi">
            </label>
          </div>
        </header>

        <div class="c-filters">
          <div class="c-chips" role="group" aria-label="Kind of file">
            @for (kind of kinds; track kind.value) {
              <button type="button" class="c-chip-btn" [attr.aria-pressed]="kindFilter() === kind.value"
                      (click)="kindFilter.set(kind.value)">
                {{ kind.label }} <span class="n">{{ countOf(kind.value) }}</span>
              </button>
            }
          </div>
          <div class="c-filter-fields">
            <div class="c-seg" role="group" aria-label="Use">
              <button type="button" [attr.aria-pressed]="useFilter() === 'ALL'" (click)="useFilter.set('ALL')">Any</button>
              <button type="button" [attr.aria-pressed]="useFilter() === 'USED'" (click)="useFilter.set('USED')">In use</button>
              <button type="button" [attr.aria-pressed]="useFilter() === 'UNUSED'" (click)="useFilter.set('UNUSED')">Unused</button>
            </div>
            <label class="c-search">
              <lucide-icon [img]="icons.Search" [size]="15" aria-hidden="true"></lucide-icon>
              <span class="sr-only">Search files</span>
              <input class="c-input" type="search" placeholder="Name, app, post…" [value]="query()"
                     (input)="query.set($any($event.target).value)">
            </label>
          </div>
        </div>

        <section class="drop-area" [class.dropping]="dropping()" aria-label="Files">
          @if (files(); as list) {
            @if (shown().length) {
              <ul class="grid">
                @for (file of shown(); track file.path) {
                  <li class="c-card file">
                    <a class="thumb" [href]="file.url" target="_blank" rel="noopener" [attr.aria-label]="'Open ' + name(file)">
                      @switch (file.kind) {
                        @case ('IMAGE') { <img [src]="file.url" alt="" loading="lazy"> }
                        @case ('VIDEO') { <lucide-icon [img]="icons.Film" [size]="34" aria-hidden="true"></lucide-icon> }
                        @case ('INSTALLER') { <lucide-icon [img]="icons.Package" [size]="34" aria-hidden="true"></lucide-icon> }
                        @default { <lucide-icon [img]="icons.File" [size]="34" aria-hidden="true"></lucide-icon> }
                      }
                    </a>
                    <div class="info">
                      <p class="name" [title]="file.path">{{ name(file) }}</p>
                      <p class="meta">{{ extension(file) }} · {{ size(file.size) }} · {{ file.uploadedAt | date: 'MMM d, y' }}</p>
                      @if (file.uses.length) {
                        <ul class="uses">
                          @for (use of usesOf(file); track $index) {
                            <li>
                              <span class="use-type">{{ useLabel(use.type) }}</span>
                              @if (use.link) {
                                <a class="c-link" [routerLink]="use.link">{{ use.label }}</a>
                              } @else {
                                {{ use.label }}
                              }
                            </li>
                          }
                          @if (file.uses.length > USES_SHOWN && !expanded().has(file.path)) {
                            <li>
                              <button type="button" class="c-link more" (click)="expand(file)">
                                +{{ file.uses.length - USES_SHOWN }} more
                              </button>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="unused">
                          <span class="c-chip">Unused</span>
                          @if (fresh(file)) { <span class="c-muted">new, maybe in an editor not saved yet</span> }
                        </p>
                      }
                    </div>
                    <div class="actions">
                      <button type="button" class="c-btn c-btn-sm" (click)="copy(file.url, 'Link')" [attr.aria-label]="'Copy link of ' + name(file)" title="Copy link">
                        <lucide-icon [img]="icons.Link" [size]="14" aria-hidden="true"></lucide-icon>
                      </button>
                      @if (file.kind === 'IMAGE') {
                        <button type="button" class="c-btn c-btn-sm" (click)="copy('![](' + file.url + ')', 'Markdown')"
                                [attr.aria-label]="'Copy Markdown of ' + name(file)" title="Copy as Markdown image">
                          <lucide-icon [img]="icons.Copy" [size]="14" aria-hidden="true"></lucide-icon> MD
                        </button>
                      }
                      <a class="c-btn c-btn-sm" [href]="file.url" target="_blank" rel="noopener" title="Open"
                         [attr.aria-label]="'Open ' + name(file) + ' in a new tab'">
                        <lucide-icon [img]="icons.ExternalLink" [size]="14" aria-hidden="true"></lucide-icon>
                      </a>
                      @if (currentUser.isOwner()) {
                        <button type="button" class="c-btn c-btn-sm c-btn-danger delete" (click)="remove(file)"
                                [disabled]="file.uses.length > 0 || busy()"
                                [title]="file.uses.length ? 'In use. Remove it there first.' : 'Delete'"
                                [attr.aria-label]="'Delete ' + name(file)">
                          <lucide-icon [img]="icons.Trash2" [size]="14" aria-hidden="true"></lucide-icon>
                        </button>
                      }
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <div class="c-card c-empty">
                @if (list.length) {
                  No file matches the filters.
                } @else {
                  <lucide-icon [img]="icons.ImageIcon" [size]="28" aria-hidden="true"></lucide-icon>
                  <p>Nothing uploaded yet. Drop files here or use Upload.</p>
                }
              </div>
            }
          } @else {
            <ul class="grid" aria-hidden="true">
              @for (n of [1, 2, 3, 4, 5, 6, 7, 8]; track n) { <li class="c-skeleton ghost"></li> }
            </ul>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .upload {
      position: relative;
      cursor: pointer;
    }

    .c-filters {
      margin-bottom: 16px;
    }

    .drop-area {
      border-radius: var(--radius);
    }

    .drop-area.dropping {
      outline: 2px dashed var(--accent);
      outline-offset: 6px;
      background: var(--accent-soft);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .ghost {
      height: 260px;
    }

    .file {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .thumb {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      background: var(--panel-2);
      color: var(--muted);
      border-bottom: 1px solid var(--line);
    }

    .thumb img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px 4px;
      min-width: 0;
    }

    .info p {
      margin: 0;
    }

    .name {
      font-family: var(--font-mono);
      font-size: 12.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      color: var(--muted);
      font-size: 12.5px;
    }

    .uses {
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
    }

    .uses li {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .more {
      font-size: 13px;
    }

    .use-type {
      color: var(--muted);
      margin-right: 6px;
    }

    .unused {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 4px !important;
      font-size: 12.5px;
    }

    .actions {
      display: flex;
      gap: 6px;
      padding: 10px 14px 14px;
    }

    .actions .delete {
      margin-left: auto;
    }

    .c-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .c-empty p {
      margin: 0;
    }

    @media (max-width: 520px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .info {
        padding: 10px 10px 2px;
      }

      .actions {
        flex-wrap: wrap;
        padding: 8px 10px 10px;
      }
    }
  `
})
export class FilesPage {
  private readonly service = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly currentUser = inject(CurrentUser);

  protected readonly icons = {Copy, ExternalLink, File: FileIcon, Film, ImageIcon, Link, Package, Search, Trash2, Upload};
  protected readonly kinds = KINDS;

  protected readonly files = signal<MediaFile[] | null>(null);
  protected readonly kindFilter = signal<KindFilter>('ALL');
  protected readonly useFilter = signal<UseFilter>('ALL');
  protected readonly query = signal('');
  protected readonly uploading = signal(0);
  protected readonly busy = signal(false);
  protected readonly dropping = signal(false);
  /** files whose every use is shown, not only the first few */
  protected readonly expanded = signal(new Set<string>());
  protected readonly USES_SHOWN = 3;

  protected readonly unused = computed(() => (this.files() ?? []).filter(file => !file.uses.length));
  /** what "Delete unused" removes: the files of the last day stay, as on the backend */
  protected readonly clearable = computed(() => this.unused().filter(file => !this.fresh(file)));
  protected readonly totalBytes = computed(() => (this.files() ?? []).reduce((sum, file) => sum + file.size, 0));
  protected readonly unusedBytes = computed(() => this.unused().reduce((sum, file) => sum + file.size, 0));

  protected readonly shown = computed(() => {
    const kind = this.kindFilter();
    const use = this.useFilter();
    const query = this.query().trim().toLowerCase();
    return (this.files() ?? []).filter(file =>
      (kind === 'ALL' || file.kind === kind)
      && (use === 'ALL' || (use === 'USED') === file.uses.length > 0)
      && (!query || file.path.toLowerCase().includes(query)
        || file.uses.some(one => one.label.toLowerCase().includes(query))));
  });

  constructor() {
    this.load();
  }

  protected usesOf(file: MediaFile) {
    return this.expanded().has(file.path) ? file.uses : file.uses.slice(0, this.USES_SHOWN);
  }

  protected expand(file: MediaFile) {
    this.expanded.update(paths => new Set(paths).add(file.path));
  }

  protected countOf(kind: KindFilter) {
    const list = this.files() ?? [];
    return kind === 'ALL' ? list.length : list.filter(file => file.kind === kind).length;
  }

  protected name(file: MediaFile) {
    return fileName(file.path);
  }

  protected extension(file: MediaFile) {
    const at = file.path.lastIndexOf('.');
    return at < 0 ? 'File' : file.path.substring(at + 1).toUpperCase();
  }

  protected size(bytes: number) {
    return readableSize(bytes);
  }

  protected useLabel(type: keyof typeof USE_LABELS) {
    return USE_LABELS[type];
  }

  protected fresh(file: MediaFile) {
    return Date.now() - new Date(file.uploadedAt).getTime() < FRESH_MS;
  }

  protected async copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(`${what} copied.`);
    } catch {
      this.toast.error('Copying did not work in this browser.');
    }
  }

  protected chosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.upload(files);
  }

  protected dragOver(event: DragEvent) {
    if (!this.currentUser.canEdit() || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dropping.set(true);
  }

  protected dragLeave(event: DragEvent) {
    // leaving a child for another child is no leaving
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.dropping.set(false);
  }

  protected dropped(event: DragEvent) {
    this.dropping.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length || !this.currentUser.canEdit()) return;
    event.preventDefault();
    this.upload(files);
  }

  protected async remove(file: MediaFile) {
    const fresh = this.fresh(file)
      ? ' It was uploaded within the last day, so it may belong to an editor that has not been saved yet.' : '';
    const ok = await this.confirm.ask({
      title: 'Delete file?',
      message: `“${this.name(file)}” (${this.size(file.size)}) is not used anywhere and is deleted for good.${fresh}`,
      confirmLabel: 'Delete file',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.service.delete(file.path).subscribe({
      next: () => {
        this.files.update(list => (list ?? []).filter(one => one.path !== file.path));
        this.busy.set(false);
        this.toast.success(`Deleted ${this.name(file)}.`);
      },
      // someone may have used it meanwhile: show how things stand now
      error: () => {
        this.busy.set(false);
        this.load();
      },
    });
  }

  protected async deleteUnused() {
    const files = this.clearable();
    const bytes = files.reduce((sum, file) => sum + file.size, 0);
    const kept = this.unused().length - files.length;
    const ok = await this.confirm.ask({
      title: `Delete ${files.length} unused ${files.length === 1 ? 'file' : 'files'}?`,
      message: `${files.length === 1 ? 'One file' : files.length + ' files'} that nothing uses (${this.size(bytes)}) `
        + `${files.length === 1 ? 'is' : 'are'} deleted for good.`
        + (kept ? ` ${kept} uploaded within the last day ${kept === 1 ? 'stays' : 'stay'}, they may belong to an editor not saved yet.` : ''),
      confirmLabel: 'Delete files',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.service.deleteUnused().subscribe({
      next: cleanup => {
        this.busy.set(false);
        this.toast.success(`Deleted ${cleanup.deleted} ${cleanup.deleted === 1 ? 'file' : 'files'} (${this.size(cleanup.bytes)}).`);
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.load();
      },
    });
  }

  private upload(files: File[]) {
    const allowed = files.filter(file => isImageFile(file) || isVideoFile(file) || isInstallerFile(file));
    if (allowed.length < files.length) {
      this.toast.error('Only images (.png, .jpg, .webp), videos (.mp4, .webm) and installers (.exe, .msi).');
    }
    if (!allowed.length) return;
    this.uploading.update(n => n + allowed.length);
    forkJoin(allowed.map(file => this.service.upload(file))).subscribe({
      next: () => {
        this.uploading.update(n => n - allowed.length);
        this.toast.success(allowed.length === 1 ? `Uploaded ${allowed[0].name}.` : `Uploaded ${allowed.length} files.`);
        this.load();
      },
      // the files that made it are listed all the same
      error: () => {
        this.uploading.update(n => n - allowed.length);
        this.load();
      },
    });
  }

  private load() {
    this.service.list().subscribe({
      next: list => this.files.set(list),
      error: () => this.files.update(list => list ?? []),
    });
  }
}
