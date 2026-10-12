import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {HttpEventType} from '@angular/common/http';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {concatMap, from, map} from 'rxjs';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CircleAlert, Film, GripVertical, ImagePlus, ImageUp, LucideAngularModule,
  Trash2, X
} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {AppService} from '../../../services/app-service';
import {FileService} from '../../../services/file-service';
import {ToastService} from '../../../services/toast-service';
import {App, AppImage} from '../../../models/app';
import {AppResponse} from '../../../models/app-response';
import {checklistDone} from '../../../models/console';
import {Visibility, VisibilityPicker} from '../../../shared/visibility-picker/visibility-picker';
import {IMAGE_FILE_HINT, isImageFile, isVideoFile, VIDEO_FILE_HINT} from '../../../shared/listing/upload-files';
import {AppTile} from '../../../shared/ui/app-tile';

/** One screenshot in the form; textOpen only steers the editor and is never saved. */
type ScreenshotGroup = FormGroup<{
  url: FormControl<string>;
  text: FormControl<string>;
  textOpen: FormControl<boolean>;
}>;

/**
 * The store listing of an app (/apps/:slug/listing) and the form for a new one (/apps/new).
 * Screenshots form the gallery on the product page; one with a text is also a feature there.
 */
@Component({
  selector: 'app-app-editor',
  imports: [ReactiveFormsModule, RouterLink, CdkDropList, CdkDrag, CdkDragHandle, LucideAngularModule,
    VisibilityPicker, AppTile],
  templateUrl: './app-editor.html',
  styleUrls: ['./app-editor.css', './app-media.css']
})
export class AppEditor {
  private readonly apps = inject(AppService);
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly context = inject(AppContext);

  protected readonly icons = {ArrowDown, ArrowLeft, ArrowUp, Check, CircleAlert, Film, GripVertical, ImagePlus, ImageUp, Trash2, X};
  protected readonly checklistDone = checklistDone;

  /** null while creating a new app */
  protected readonly stored = signal<AppResponse | null>(null);
  protected readonly ready = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingIcon = signal(false);
  /** e.g. {done: 1, total: 4} while screenshots upload one after another */
  protected readonly screenshotUpload = signal<{ done: number; total: number } | null>(null);
  /** 0–100 while the video uploads */
  protected readonly videoProgress = signal<number | null>(null);
  protected readonly isNew = computed(() => !this.context.slug());
  protected readonly busy = computed(() =>
    this.uploadingIcon() || this.screenshotUpload() !== null || this.videoProgress() !== null);
  /** the slug follows the name until it is edited by hand, and never changes by itself once saved */
  private slugFollowsName = true;

  readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: Validators.required}),
    slug: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]}),
    slogan: new FormControl('', {nonNullable: true, validators: Validators.required}),
    description: new FormControl('', {nonNullable: true, validators: Validators.required}),
    category: new FormControl('', {nonNullable: true, validators: Validators.required}),
    platforms: new FormControl('', {nonNullable: true, validators: Validators.required}),
    iconUrl: new FormControl('', {nonNullable: true, validators: Validators.required}),
    images: new FormArray<ScreenshotGroup>([]),
    videoUrl: new FormControl('', {nonNullable: true}),
    modrinthId: new FormControl('', {nonNullable: true}),
    curseforgeId: new FormControl('', {nonNullable: true}),
    highlighted: new FormControl(false, {nonNullable: true}),
    legacy: new FormControl(false, {nonNullable: true}),
    publishedAt: new FormControl(today(), {nonNullable: true, validators: Validators.required}),
    visibility: new FormControl<Visibility>('PRIVATE', {nonNullable: true}),
  });

  protected get screenshots() {
    return this.form.controls.images;
  }

  constructor() {
    effect(() => {
      const app = this.context.app();
      if (untracked(this.ready)) return;
      if (this.isNew()) {
        this.ready.set(true);
      } else if (app) {
        untracked(() => this.load(app.id));
      }
    });

    this.form.controls.slug.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.controls.slug.dirty) this.slugFollowsName = false;
    });
    this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(name => {
      if (this.slugFollowsName) this.form.controls.slug.setValue(slugify(name), {emitEvent: false});
    });
  }

  private load(id: number) {
    this.apps.getById(id).pipe(map(response => response.body!)).subscribe(app => {
      this.stored.set(app);
      this.slugFollowsName = false;
      this.form.patchValue({
        name: app.name ?? '', slug: app.slug ?? '', slogan: app.slogan ?? '', description: app.description ?? '',
        category: app.category ?? '', platforms: app.platforms ?? '', iconUrl: app.iconUrl ?? '',
        videoUrl: app.videoUrl ?? '',
        modrinthId: app.modrinthId ?? '', curseforgeId: app.curseforgeId ?? '',
        highlighted: !!app.highlighted, legacy: !!app.legacy,
        publishedAt: app.publishedAt ? String(app.publishedAt).substring(0, 10) : today(),
        visibility: (app.visibility ?? 'PRIVATE') as Visibility,
      });
      this.screenshots.clear();
      (app.images ?? []).forEach(image => this.screenshots.push(screenshotGroup(image)));
      this.form.markAsPristine();
      this.ready.set(true);
    });
  }

  // icon

  protected onIconSelected(event: Event) {
    const file = takeFile(event);
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.uploadingIcon.set(true);
    this.files.uploadImage(file).subscribe({
      next: response => {
        this.form.controls.iconUrl.setValue(response.url);
        this.form.markAsDirty();
        this.uploadingIcon.set(false);
      },
      error: () => this.uploadingIcon.set(false),
    });
  }

  // screenshots

  /** Several files at once; they are added in the order they were chosen. */
  protected onScreenshotsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const chosen = [...(input.files ?? [])];
    input.value = '';
    const images = chosen.filter(isImageFile);
    if (images.length < chosen.length) this.toast.error(`${chosen.length - images.length} skipped. ${IMAGE_FILE_HINT}`);
    if (!images.length) return;

    this.screenshotUpload.set({done: 0, total: images.length});
    from(images).pipe(concatMap(file => this.files.uploadImage(file))).subscribe({
      next: response => {
        this.screenshots.push(screenshotGroup({url: response.url, text: null}));
        this.form.markAsDirty();
        this.screenshotUpload.update(state => state && {...state, done: state.done + 1});
      },
      error: () => this.screenshotUpload.set(null),
      complete: () => {
        const count = images.length;
        this.screenshotUpload.set(null);
        this.toast.success(count === 1 ? 'Screenshot added.' : `${count} screenshots added.`);
      },
    });
  }

  protected dropScreenshot(event: CdkDragDrop<unknown>) {
    this.moveScreenshot(event.previousIndex, event.currentIndex);
  }

  /** The arrow buttons do the same as dragging, for the keyboard. */
  protected moveScreenshot(from: number, to: number) {
    if (from === to || to < 0 || to >= this.screenshots.length) return;
    const moved = this.screenshots.at(from);
    this.screenshots.removeAt(from, {emitEvent: false});
    this.screenshots.insert(to, moved);
    this.form.markAsDirty();
  }

  protected removeScreenshot(index: number) {
    this.screenshots.removeAt(index);
    this.form.markAsDirty();
  }

  protected openText(group: ScreenshotGroup) {
    group.controls.textOpen.setValue(true);
  }

  protected removeText(group: ScreenshotGroup) {
    group.patchValue({text: '', textOpen: false});
    this.form.markAsDirty();
  }

  protected featureCount() {
    return this.screenshots.controls.filter(group => group.controls.text.value.trim()).length;
  }

  // video

  protected onVideoSelected(event: Event) {
    const file = takeFile(event);
    if (!file) return;
    if (!isVideoFile(file)) {
      this.toast.error(VIDEO_FILE_HINT);
      return;
    }
    this.videoProgress.set(0);
    this.files.uploadVideo(file).subscribe({
      next: httpEvent => {
        if (httpEvent.type === HttpEventType.UploadProgress && httpEvent.total) {
          this.videoProgress.set(Math.round(100 * httpEvent.loaded / httpEvent.total));
        } else if (httpEvent.type === HttpEventType.Response && httpEvent.body) {
          this.form.controls.videoUrl.setValue(httpEvent.body.url);
          this.form.markAsDirty();
          this.videoProgress.set(null);
          this.toast.success('Video uploaded.');
        }
      },
      error: () => this.videoProgress.set(null),
    });
  }

  protected removeVideo() {
    this.form.controls.videoUrl.setValue('');
    this.form.markAsDirty();
  }

  // saving

  protected save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Some fields are still empty. Every field of the store listing is shown on the website.');
      return;
    }

    const {images, ...value} = this.form.getRawValue();
    const request: App = {
      ...value,
      id: this.stored()?.id ?? 0,
      slug: value.slug.trim(),
      images: images.map(image => ({url: image.url, text: image.text.trim() || null})),
      videoUrl: value.videoUrl || null,
      publishedAt: value.publishedAt as unknown as Date,
    };

    this.saving.set(true);
    const save$ = this.isNew() ? this.apps.create(request) : this.apps.update(request);
    save$.subscribe({
      next: response => {
        this.saving.set(false);
        this.form.markAsPristine();
        const saved = response.body!;
        if (this.isNew()) {
          this.toast.success(`${saved.name} created. It stays private until you make it visible.`);
          this.router.navigate(['/apps', saved.slug]);
        } else if (saved.slug !== this.context.slug()) {
          this.toast.success('Store listing saved. The app has a new address.');
          this.router.navigate(['/apps', saved.slug, 'listing']);
        } else {
          this.stored.set(saved);
          this.toast.success('Store listing saved.');
          this.context.refresh().subscribe();
        }
      },
      error: () => this.saving.set(false),
    });
  }

  protected async deleteApp() {
    const app = this.stored();
    if (!app) return;
    const ok = await this.confirm.ask({
      title: `Delete ${app.name}?`,
      message: 'The app disappears from the website and the Adeptstack app. This cannot be undone.',
      confirmLabel: 'Delete app', danger: true,
    });
    if (!ok) return;
    this.apps.deleteById(app.id!).subscribe(() => {
      this.toast.success(`${app.name} deleted.`);
      this.router.navigate(['/apps']);
    });
  }
}

function screenshotGroup(image: AppImage): ScreenshotGroup {
  return new FormGroup({
    url: new FormControl(image.url, {nonNullable: true}),
    text: new FormControl(image.text ?? '', {nonNullable: true}),
    textOpen: new FormControl(!!image.text?.trim(), {nonNullable: true}),
  });
}

/** The chosen file; the input is reset so the same file can be chosen again. */
function takeFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  return file;
}

/** "Create Train Doors" -> "create-train-doors" */
function slugify(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
