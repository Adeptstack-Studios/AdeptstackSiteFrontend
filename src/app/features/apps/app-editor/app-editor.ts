import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {NgTemplateOutlet} from '@angular/common';
import {map} from 'rxjs';
import {ArrowLeft, Check, CircleAlert, ImageUp, LucideAngularModule, Trash2} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {AppService} from '../../../services/app-service';
import {FileService} from '../../../services/file-service';
import {ToastService} from '../../../services/toast-service';
import {App} from '../../../models/app';
import {AppResponse} from '../../../models/app-response';
import {checklistDone} from '../../../models/console';
import {Visibility, VisibilityPicker} from '../../../shared/visibility-picker/visibility-picker';
import {IMAGE_FILE_HINT, isImageFile} from '../../../shared/listing/upload-files';
import {AppTile} from '../../../shared/ui/app-tile';

type ImageField = 'iconUrl' | 'image1Url' | 'image2Url' | 'image3Url';

/**
 * The store listing of an app (/apps/:slug/listing) and the form for a new one (/apps/new).
 * Phase 2 adds the preview as on the website; until then this is the plain form.
 */
@Component({
  selector: 'app-app-editor',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, LucideAngularModule, VisibilityPicker, AppTile],
  templateUrl: './app-editor.html',
  styleUrl: './app-editor.css'
})
export class AppEditor {
  private readonly apps = inject(AppService);
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly context = inject(AppContext);

  protected readonly icons = {ArrowLeft, Check, CircleAlert, ImageUp, Trash2};
  protected readonly checklistDone = checklistDone;
  protected readonly features = [1, 2, 3] as const;

  /** null while creating a new app */
  protected readonly stored = signal<AppResponse | null>(null);
  protected readonly ready = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal<ImageField | null>(null);
  protected readonly isNew = computed(() => !this.context.slug());
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
    image1Url: new FormControl('', {nonNullable: true, validators: Validators.required}),
    feature1Desc: new FormControl('', {nonNullable: true, validators: Validators.required}),
    image2Url: new FormControl('', {nonNullable: true, validators: Validators.required}),
    feature2Desc: new FormControl('', {nonNullable: true, validators: Validators.required}),
    image3Url: new FormControl('', {nonNullable: true, validators: Validators.required}),
    feature3Desc: new FormControl('', {nonNullable: true, validators: Validators.required}),
    modrinthId: new FormControl('', {nonNullable: true}),
    curseforgeId: new FormControl('', {nonNullable: true}),
    highlighted: new FormControl(false, {nonNullable: true}),
    legacy: new FormControl(false, {nonNullable: true}),
    publishedAt: new FormControl(today(), {nonNullable: true, validators: Validators.required}),
    visibility: new FormControl<Visibility>('PRIVATE', {nonNullable: true}),
  });

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
        image1Url: app.image1Url ?? '', feature1Desc: app.feature1Desc ?? '',
        image2Url: app.image2Url ?? '', feature2Desc: app.feature2Desc ?? '',
        image3Url: app.image3Url ?? '', feature3Desc: app.feature3Desc ?? '',
        modrinthId: app.modrinthId ?? '', curseforgeId: app.curseforgeId ?? '',
        highlighted: !!app.highlighted, legacy: !!app.legacy,
        publishedAt: app.publishedAt ? String(app.publishedAt).substring(0, 10) : today(),
        visibility: (app.visibility ?? 'PRIVATE') as Visibility,
      });
      this.form.markAsPristine();
      this.ready.set(true);
    });
  }

  protected imageControl(field: ImageField) {
    return this.form.controls[field];
  }

  protected featureText(index: 1 | 2 | 3) {
    return this.form.controls[`feature${index}Desc`];
  }

  protected onImageSelected(event: Event, field: ImageField) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.uploading.set(field);
    this.files.uploadImage(file).subscribe({
      next: response => {
        this.form.controls[field].setValue(response.url);
        this.form.markAsDirty();
        this.uploading.set(null);
        this.toast.success('Image uploaded.');
      },
      error: () => this.uploading.set(null),
    });
  }

  protected save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Some fields are still empty. Every field of the store listing is shown on the website.');
      return;
    }

    const value = this.form.getRawValue();
    const request: App = {
      ...value,
      id: this.stored()?.id ?? 0,
      slug: value.slug.trim(),
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

/** "Create Train Doors" -> "create-train-doors" */
function slugify(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
