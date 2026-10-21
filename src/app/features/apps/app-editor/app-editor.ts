import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {HttpEventType} from '@angular/common/http';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {concatMap, forkJoin, from, map, startWith} from 'rxjs';
import {
  ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Check, CircleAlert, Film, GripVertical, ImagePlus, Images, ImageUp, LucideAngularModule,
  Trash2, X
} from 'lucide-angular';
import {MediaPickerService} from '../../../shared/media/media-picker';
import {AppContext} from '../../../core/app-context/app-context';
import {AppService} from '../../../services/app-service';
import {FileService} from '../../../services/file-service';
import {App, AppImage} from '../../../models/app';
import {AppResponse} from '../../../models/app-response';
import {checklistDone} from '../../../models/console';
import {Visibility, VisibilityPicker} from '../../../shared/visibility-picker/visibility-picker';
import {IMAGE_FILE_HINT, isImageFile, isVideoFile, VIDEO_FILE_HINT} from '../../../shared/listing/upload-files';
import {AppTile} from '../../../shared/ui/app-tile';
import {SLUG_PATTERN, slugify} from '../../../shared/slug';
import {EditorPage, today} from '../../../shared/editor/editor-page';
import {ListingPreview, ListingPreviewData} from '../listing-preview/listing-preview';
import {listingChecklist} from './listing-checklist';
import {EditOnly} from '../../../shared/ui/edit-only';
import {ReviewService} from '../../../services/review-service';
import {planText, ReviewDetail, submittedReview} from '../../../models/review';
import {ChangelogsService} from '../../../services/changelogs-service';
import {Changelogs} from '../../../models/changelogs';
import {formatMoment, isAhead, localInputToIso, toLocalInput} from '../../../shared/time';
import {ReviewBanner} from '../../../shared/review/review-banner';
import {CurrentUser} from '../../../core/auth/current-user';

/** One screenshot in the form; textOpen only steers the editor and is never saved. */
type ScreenshotGroup = FormGroup<{
  url: FormControl<string>;
  text: FormControl<string>;
  textOpen: FormControl<boolean>;
}>;

function listingForm() {
  return new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: Validators.required}),
    slug: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(SLUG_PATTERN)]}),
    slogan: new FormControl('', {nonNullable: true, validators: Validators.required}),
    description: new FormControl('', {nonNullable: true, validators: Validators.required}),
    category: new FormControl('', {nonNullable: true, validators: Validators.required}),
    platforms: new FormControl('', {nonNullable: true, validators: Validators.required}),
    iconUrl: new FormControl('', {nonNullable: true, validators: Validators.required}),
    images: new FormArray<ScreenshotGroup>([]),
    videoUrl: new FormControl('', {nonNullable: true}),
    backgroundUrl: new FormControl('', {nonNullable: true}),
    modrinthId: new FormControl('', {nonNullable: true}),
    curseforgeId: new FormControl('', {nonNullable: true}),
    highlighted: new FormControl(false, {nonNullable: true}),
    legacy: new FormControl(false, {nonNullable: true}),
    publishedAt: new FormControl(today(), {nonNullable: true, validators: Validators.required}),
    visibility: new FormControl<Visibility>('PRIVATE', {nonNullable: true}),
  });
}

type ListingFormValue = ReturnType<ReturnType<typeof listingForm>['getRawValue']>;

/**
 * The store listing of an app (/apps/:slug/listing) and the form for a new one (/apps/new).
 * Like the release and post editors it keeps unsaved work in this browser and asks before leaving it.
 * Screenshots form the gallery on the product page; one with a text is also a feature there.
 */
@Component({
  selector: 'app-app-editor',
  imports: [ReactiveFormsModule, RouterLink, CdkDropList, CdkDrag, CdkDragHandle, LucideAngularModule,
    VisibilityPicker, AppTile, ListingPreview, EditOnly, ReviewBanner],
  templateUrl: './app-editor.html',
  styleUrls: ['./app-editor.css', './app-media.css']
})
export class AppEditor extends EditorPage<ListingFormValue> {
  private readonly apps = inject(AppService);
  private readonly reviews = inject(ReviewService);
  private readonly currentUser = inject(CurrentUser);
  private readonly files = inject(FileService);
  private readonly picker = inject(MediaPickerService);
  private readonly changelogs = inject(ChangelogsService);
  private readonly router = inject(Router);
  protected readonly context = inject(AppContext);

  protected readonly icons = {ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Check, CircleAlert, Film, GripVertical, ImagePlus, Images, ImageUp, Trash2, X};
  protected readonly checklistDone = checklistDone;

  /** null while creating a new app */
  protected readonly stored = signal<AppResponse | null>(null);
  /** a change of the listing waiting for review, or sent back */
  protected readonly openReview = signal<ReviewDetail | null>(null);
  private readonly myReview = computed(() => this.openReview()?.review.author === this.currentUser.user()?.username);
  /** someone else's change waits for review: only they can change this entry until then */
  protected readonly lockedByOther = computed(() => !!this.openReview() && !this.myReview());
  protected readonly uploadingIcon = signal(false);
  protected readonly uploadingBackground = signal(false);
  /** approved changes of this listing that go live later, with a release or at a moment */
  protected readonly plans = signal<ReviewDetail[]>([]);
  /** releases of this app that are not out yet: a listing change can go live with one of them */
  protected readonly upcoming = signal<Changelogs[]>([]);
  /** the planned change being edited, replaced once the new version is approved */
  protected readonly replacesPlan = signal<number | null>(null);
  readonly planForm = new FormGroup({
    when: new FormControl<'now' | 'plan'>('now', {nonNullable: true}),
    kind: new FormControl<'release' | 'at'>('release', {nonNullable: true}),
    releaseId: new FormControl<number | null>(null),
    at: new FormControl('', {nonNullable: true}),
  });
  protected readonly planValue = toSignal(this.planForm.valueChanges.pipe(startWith(null), map(() => this.planForm.getRawValue())),
    {requireSync: true});
  /** the screenshot whose image is being replaced by an upload */
  protected readonly replacingShot = signal<ScreenshotGroup | null>(null);
  /** e.g. {done: 1, total: 4} while screenshots upload one after another */
  protected readonly screenshotUpload = signal<{ done: number; total: number } | null>(null);
  /** 0–100 while the video uploads */
  protected readonly videoProgress = signal<number | null>(null);
  protected readonly isNew = computed(() => !this.context.slug());
  /** the form, or the product page as the website shows it */
  protected readonly mode = signal<'edit' | 'preview'>('edit');
  protected readonly busy = computed(() => this.uploadingIcon() || this.uploadingBackground()
    || this.replacingShot() !== null || this.screenshotUpload() !== null || this.videoProgress() !== null);
  /** the slug follows the name until it is edited by hand, and never changes by itself once saved */
  private slugFollowsName = true;

  readonly form = listingForm();

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(null), map(() => this.form.getRawValue())),
    {requireSync: true});
  protected readonly checklist = computed(() => listingChecklist(this.value()));
  /** a private listing that stays private is saved; anything on the website is reviewed first */
  protected readonly saveLabel = computed(() => {
    if (this.lockedByOther()) return 'Waiting for review';
    const goesLive = this.value().visibility !== 'PRIVATE' || (this.stored()?.visibility ?? 'PRIVATE') !== 'PRIVATE';
    if (this.isNew()) return goesLive ? 'Create and submit' : 'Create app';
    if (!goesLive) return 'Save';
    if (this.planned()) return this.myReview() ? 'Submit plan again' : 'Submit plan for review';
    return this.myReview() ? 'Submit again' : 'Submit for review';
  });
  /** a live listing (or one going live) can wait for a release or a moment */
  protected readonly canPlan = computed(() => !this.isNew() && !this.lockedByOther()
    && (this.value().visibility !== 'PRIVATE' || (this.stored()?.visibility ?? 'PRIVATE') !== 'PRIVATE'));
  protected readonly planned = computed(() => this.canPlan() && this.planValue().when === 'plan');
  protected readonly previewData = computed<ListingPreviewData>(() => this.value());

  protected get screenshots() {
    return this.form.controls.images;
  }

  constructor() {
    super();
    effect(() => {
      const app = this.context.app();
      if (untracked(this.ready)) return;
      if (this.isNew()) {
        untracked(() => this.loaded());
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
    this.keepDrafts();
  }

  /** by id, not slug: the address may change with the listing */
  protected draftKey() {
    return `listing-draft:${this.stored()?.id ?? 'new'}`;
  }

  /** the kept screenshots first get their rows: the form only takes a value of the same shape */
  protected override restoreDraft() {
    const kept = this.draft.restorable();
    if (kept) {
      this.screenshots.clear({emitEvent: false});
      kept.value.images.forEach(image => this.screenshots.push(screenshotGroup(image), {emitEvent: false}));
    }
    const value = super.restoreDraft();
    if (value) this.slugFollowsName = this.isNew() && value.slug === slugify(value.name);
    return value;
  }

  private load(id: number) {
    forkJoin({
      app: this.apps.getById(id).pipe(map(response => response.body!)),
      review: this.reviews.openFor('APP', id),
    }).subscribe(({app: stored, review}) => {
      this.stored.set(stored);
      this.openReview.set(review);
      // the author goes on with what they submitted, not with the live listing
      const mine = !!review?.payload && this.myReview();
      const app = (mine ? {...stored, ...review!.payload} : stored) as AppResponse;
      this.fill(app);
      if (mine) this.takePlan(review!.payload!);
      this.loaded();
    });
    this.loadPlans(id);
  }

  /** The planned changes and the releases a change can go live with. */
  private loadPlans(id: number) {
    this.reviews.planned('APP', id).subscribe(plans => this.plans.set(plans));
    this.changelogs.list({app: id, size: 100}).subscribe(page => {
      const now = Date.now();
      this.upcoming.set(page.items
        .filter(release => !!release.plan || (release.visibility !== 'PRIVATE' && !!release.releaseAt
          && new Date(release.releaseAt).getTime() > now))
        .sort((a, b) => String(a.releaseAt ?? '').localeCompare(String(b.releaseAt ?? ''))));
    });
  }

  /** The plan a submitted or planned version carries, into the plan controls. */
  private takePlan(payload: Record<string, unknown>) {
    const releaseId = payload['planReleaseId'] as number | null | undefined;
    const at = payload['planAt'] as string | null | undefined;
    this.replacesPlan.set((payload['replacesPlan'] as number | null | undefined) ?? null);
    if (releaseId == null && !at) {
      this.planForm.reset({when: 'now', kind: 'release', releaseId: null, at: ''});
      return;
    }
    this.planForm.reset({
      when: 'plan', kind: releaseId != null ? 'release' : 'at', releaseId: releaseId ?? null, at: at ? toLocalInput(at) : '',
    });
  }

  /** The form from a listing: the live one, a submitted version or a planned one. */
  private fill(app: AppResponse) {
    this.slugFollowsName = false;
    this.form.patchValue({
      name: app.name ?? '', slug: app.slug ?? '', slogan: app.slogan ?? '', description: app.description ?? '',
      category: app.category ?? '', platforms: app.platforms ?? '', iconUrl: app.iconUrl ?? '',
      videoUrl: app.videoUrl ?? '',
      backgroundUrl: app.backgroundUrl ?? '',
      modrinthId: app.modrinthId ?? '', curseforgeId: app.curseforgeId ?? '',
      highlighted: !!app.highlighted, legacy: !!app.legacy,
      publishedAt: app.publishedAt ? String(app.publishedAt).substring(0, 10) : today(),
      visibility: (app.visibility ?? 'PRIVATE') as Visibility,
    });
    this.screenshots.clear();
    (app.images ?? []).forEach(image => this.screenshots.push(screenshotGroup(image)));
  }

  // plans

  protected planLabel(plan: ReviewDetail) {
    return planText(plan.review);
  }

  protected releaseLabel(release: Changelogs) {
    return `${release.version} (${release.channel}) · ${formatMoment(release.releaseAt)}`;
  }

  protected setPlan(patch: Partial<{ when: 'now' | 'plan'; kind: 'release' | 'at' }>) {
    this.planForm.patchValue(patch);
    if (patch.when === 'plan' && this.planForm.controls.releaseId.value == null && this.upcoming().length) {
      this.planForm.controls.releaseId.setValue(this.upcoming()[0].id ?? null);
    }
    if (patch.when === 'plan' && !this.upcoming().length) this.planForm.controls.kind.setValue('at');
    this.form.markAsDirty();
  }

  protected planAtAhead() {
    return isAhead(this.planValue().at);
  }

  /** the author edits their plan, an owner any plan */
  protected canChangePlan(plan: ReviewDetail) {
    return plan.review.author === this.currentUser.user()?.username || this.currentUser.isOwner();
  }

  /** The planned version into the form; submitting it replaces the plan once approved. */
  protected async editPlan(plan: ReviewDetail) {
    if (this.form.dirty) {
      const ok = await this.confirm.ask({
        title: 'Edit the planned change?',
        message: 'The form gets the planned listing; what you changed here so far is replaced.',
        confirmLabel: 'Edit the plan',
      });
      if (!ok) return;
    }
    const stored = this.stored();
    if (!stored || !plan.payload) return;
    this.fill({...stored, ...plan.payload} as AppResponse);
    this.takePlan({...plan.payload, replacesPlan: plan.review.id});
    this.form.markAsDirty();
    this.toast.info('The form shows the planned listing. Submit it to change the plan.');
  }

  protected async cancelPlan(plan: ReviewDetail) {
    const ok = await this.confirm.ask({
      title: 'Call off the planned change?',
      message: `The change planned ${this.planLabel(plan)} does not go live. The listing stays as it is.`,
      confirmLabel: 'Call it off', danger: true,
    });
    if (!ok) return;
    this.reviews.cancelPlan(plan.review.id).subscribe(() => {
      if (this.replacesPlan() === plan.review.id) this.replacesPlan.set(null);
      this.toast.success('The planned change is called off.');
      const app = this.stored();
      if (app?.id) this.loadPlans(app.id);
    });
  }

  /** What the request carries for the plan; null when it is not complete yet. */
  private planRequest(): Pick<App, 'planAt' | 'planReleaseId' | 'replacesPlan'> | null {
    if (!this.planned()) return {planAt: null, planReleaseId: null, replacesPlan: null};
    const plan = this.planValue();
    if (plan.kind === 'release') {
      if (plan.releaseId == null) {
        this.toast.error('Choose the release the change goes live with, or a moment.');
        return null;
      }
      return {planReleaseId: plan.releaseId, planAt: null, replacesPlan: this.replacesPlan()};
    }
    if (!isAhead(plan.at)) {
      this.toast.error('A plan needs a moment that lies ahead.');
      return null;
    }
    return {planAt: localInputToIso(plan.at), planReleaseId: null, replacesPlan: this.replacesPlan()};
  }

  /** After submitting or withdrawing: the open review as it is now. */
  protected reloadReview() {
    const app = this.stored();
    if (!app?.id) return;
    this.reviews.openFor('APP', app.id).subscribe(review => this.openReview.set(review));
    this.apps.getById(app.id).subscribe(response => this.stored.set(response.body));
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

  protected async pickIcon() {
    await this.pickInto(this.form.controls.iconUrl);
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

  protected async pickScreenshot() {
    const url = await this.picker.pick();
    if (!url) return;
    this.screenshots.push(screenshotGroup({url, text: null}));
    this.form.markAsDirty();
  }

  /** A new image for a screenshot; its place and text stay. */
  protected onScreenshotReplaced(event: Event, group: ScreenshotGroup) {
    const file = takeFile(event);
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.replacingShot.set(group);
    this.files.uploadImage(file).subscribe({
      next: response => {
        group.controls.url.setValue(response.url);
        this.form.markAsDirty();
        this.replacingShot.set(null);
      },
      error: () => this.replacingShot.set(null),
    });
  }

  protected async pickScreenshotImage(group: ScreenshotGroup) {
    await this.pickInto(group.controls.url);
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

  // background

  protected onBackgroundSelected(event: Event) {
    const file = takeFile(event);
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.uploadingBackground.set(true);
    this.files.uploadImage(file).subscribe({
      next: response => {
        this.form.controls.backgroundUrl.setValue(response.url);
        this.form.markAsDirty();
        this.uploadingBackground.set(false);
      },
      error: () => this.uploadingBackground.set(false),
    });
  }

  protected async pickBackground() {
    await this.pickInto(this.form.controls.backgroundUrl);
  }

  protected removeBackground() {
    this.form.controls.backgroundUrl.setValue('');
    this.form.markAsDirty();
  }

  /** an image already uploaded, from the files */
  private async pickInto(control: FormControl<string>) {
    const url = await this.picker.pick();
    if (!url) return;
    control.setValue(url);
    this.form.markAsDirty();
  }

  // saving

  protected save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.error('Some fields are still empty. Every field of the store listing is shown on the website.');
      return;
    }

    const plan = this.planRequest();
    if (!plan) return;
    const {images, ...value} = this.form.getRawValue();
    const request: App = {
      ...value,
      ...plan,
      id: this.stored()?.id ?? 0,
      slug: value.slug.trim(),
      images: images.map(image => ({url: image.url, text: image.text.trim() || null})),
      videoUrl: value.videoUrl || null,
      backgroundUrl: value.backgroundUrl || null,
      publishedAt: value.publishedAt as unknown as Date,
    };

    this.saving.set(true);
    const save$ = this.isNew() ? this.apps.create(request) : this.apps.update(request);
    save$.subscribe({
      next: response => {
        this.saving.set(false);
        this.settled();
        const review = submittedReview(response);
        if (review) {
          this.reviews.refreshCounts();
          if (this.isNew()) {
            this.toast.success(`${request.name} is created as a private draft and submitted for review.`);
            this.router.navigate(['/apps', request.slug]);
          } else {
            this.toast.success(plan.planReleaseId != null || plan.planAt
              ? 'The planned change is submitted for review. Once approved it waits and goes live as planned.'
              : 'The store listing is submitted for review. It changes once an owner approves it.');
            this.reloadReview();
          }
          return;
        }
        this.openReview.set(null);
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
      message: app.visibility === 'PRIVATE'
        ? 'The private app is deleted. This cannot be undone.'
        : 'The app is live, so deleting it is submitted for review first. Once approved it disappears from the website and the Adeptstack app.',
      confirmLabel: app.visibility === 'PRIVATE' ? 'Delete app' : 'Submit deletion', danger: true,
    });
    if (!ok) return;
    this.apps.deleteById(app.id!).subscribe(response => {
      if (submittedReview(response)) {
        this.reviews.refreshCounts();
        this.toast.success(`Deleting ${app.name} is submitted for review. It stays live until an owner approves.`);
        this.reloadReview();
        return;
      }
      this.settled();
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
