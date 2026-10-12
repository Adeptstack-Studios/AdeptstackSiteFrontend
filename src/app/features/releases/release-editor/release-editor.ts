import {Component, computed, DestroyRef, effect, HostListener, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {debounceTime, forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {MarkdownComponent} from 'ngx-markdown';
import {
  ArrowLeft, Check, CircleAlert, CircleX, Download, ImageUp, LucideAngularModule, Plus, Trash2, Upload, X
} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {HasUnsavedChanges} from '../../../core/unsaved/unsaved-changes';
import {ChangelogsService} from '../../../services/changelogs-service';
import {ConsoleService} from '../../../services/console-service';
import {FileService} from '../../../services/file-service';
import {ToastService} from '../../../services/toast-service';
import {Changelogs} from '../../../models/changelogs';
import {AppSummary, LINK_FIELDS, LinkField, LinkSuggestion} from '../../../models/console';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {channelKind, suggestVersions, VersionSuggestion} from '../../../shared/versions';
import {IMAGE_FILE_HINT, INSTALLER_FILE_HINT, isImageFile, isInstallerFile} from '../../../shared/listing/upload-files';
import {AppTile} from '../../../shared/ui/app-tile';
import {relativeDay} from '../../../shared/ui/relative-day';
import {checkRelease, NOTES_TEMPLATE, ReleaseDraft} from './release-checks';

/** Channel names for an app without releases, until the stable/beta migration renames them. */
const DEFAULT_CHANNELS = {stable: 'main', beta: 'develop'};
/** Work in progress is kept in this browser, so a closed tab or an expired session loses nothing. */
const LOCAL_DRAFT_PREFIX = 'release-draft:';
const LOCAL_SAVE_DELAY_MS = 1500;

const PUBLISH_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  {value: 'PRIVATE', label: 'Private draft', hint: 'Only visible here'},
  {value: 'UNLISTED', label: 'Unlisted', hint: 'Reachable by link and in the app, not listed'},
  {value: 'PUBLIC', label: 'Public', hint: 'Listed on adeptstack.net and in the app'},
];

interface LocalDraft {
  savedAt: number;
  value: ReturnType<ReleaseEditor['form']['getRawValue']>;
}

/** Creates and edits releases of the open app: /apps/:slug/releases/new and /apps/:slug/releases/:id */
@Component({
  selector: 'app-release-editor',
  imports: [ReactiveFormsModule, RouterLink, CdkMenuTrigger, CdkMenu, CdkMenuItem, MarkdownComponent,
    LucideAngularModule, AppTile],
  templateUrl: './release-editor.html',
  styleUrls: ['./release-editor.css', './release-editor-side.css']
})
export class ReleaseEditor implements HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changelogs = inject(ChangelogsService);
  private readonly console = inject(ConsoleService);
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly context = inject(AppContext);

  protected readonly icons = {ArrowLeft, Check, CircleAlert, CircleX, Download, ImageUp, Plus, Trash2, Upload, X};
  protected readonly publishOptions = PUBLISH_OPTIONS;
  protected readonly linkFields = LINK_FIELDS;

  /** null for a new release */
  protected readonly releaseId = signal<number | null>(null);
  /** the release as stored, for an existing one */
  protected readonly stored = signal<Changelogs | null>(null);
  protected readonly ready = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal<'cover' | 'file' | null>(null);
  protected readonly suggestions = signal<LinkSuggestion[]>([]);
  /** every release of the app, for duplicate and "higher than" checks */
  private readonly allReleases = signal<Changelogs[]>([]);
  /** link rows shown even while empty, because they were added */
  protected readonly addedLinks = signal<LinkField[]>([]);
  protected readonly localSavedAt = signal<number | null>(null);
  protected readonly restorable = signal<LocalDraft | null>(null);
  protected readonly customChannel = signal(false);
  /** the title follows the version until it is edited by hand */
  private titleFollowsVersion = true;

  readonly form = new FormGroup({
    version: new FormControl('', {nonNullable: true, validators: Validators.required}),
    channel: new FormControl('', {nonNullable: true, validators: Validators.required}),
    title: new FormControl('', {nonNullable: true, validators: Validators.required}),
    description: new FormControl('', {nonNullable: true, validators: Validators.required}),
    content: new FormControl('', {nonNullable: true, validators: Validators.required}),
    imageUrl: new FormControl('', {nonNullable: true}),
    links: new FormGroup(Object.fromEntries(LINK_FIELDS.map(({field}) =>
      [field, new FormControl('', {nonNullable: true})])) as Record<LinkField, FormControl<string>>),
    visibility: new FormControl<Visibility>('PUBLIC', {nonNullable: true}),
    publishedAt: new FormControl(today(), {nonNullable: true, validators: Validators.required}),
    push: new FormControl(true, {nonNullable: true}),
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {initialValue: this.form.getRawValue()});

  protected readonly isNew = computed(() => this.releaseId() === null);
  /** an existing release that is already out: editing it changes what people see right away */
  protected readonly isLive = computed(() => !!this.stored() && this.stored()!.visibility !== 'PRIVATE');

  protected readonly channelOptions = computed(() => {
    const names = (this.context.app()?.channels ?? []).map(channel => channel.name);
    if (!names.some(name => channelKind(name) === 'stable')) names.unshift(DEFAULT_CHANNELS.stable);
    if (!names.some(name => channelKind(name) === 'beta')) names.push(DEFAULT_CHANNELS.beta);
    return names;
  });

  protected readonly versionSuggestions = computed<VersionSuggestion[]>(() => {
    const channels = this.context.app()?.channels ?? [];
    const stable = channels.find(channel => channelKind(channel.name) === 'stable')?.latest.version;
    const beta = channels.find(channel => channelKind(channel.name) === 'beta')?.latest.version;
    return suggestVersions(stable, beta);
  });

  protected readonly latestLine = computed(() => (this.context.app()?.channels ?? [])
    .map(channel => `${channel.name} ${channel.latest.version}`).join(', '));

  protected readonly checks = computed(() => {
    const value = this.value();
    const channel = value.channel.trim().toLowerCase();
    const others = this.allReleases()
      .filter(release => release.id !== this.releaseId() && release.channel?.trim().toLowerCase() === channel)
      .map(release => release.version ?? '');
    const draft: ReleaseDraft = {...value, links: value.links};
    return checkRelease(draft, others, !!this.context.app()?.iconUrl);
  });
  protected readonly blocked = computed(() => this.checks().some(check => !check.ok && check.severity === 'error'));

  /** The newest release in the chosen channel, to copy its notes from. */
  protected readonly copySource = computed(() => {
    const channel = this.value().channel.trim().toLowerCase();
    return this.context.app()?.channels.find(other => other.name.toLowerCase() === channel)?.latest ?? null;
  });

  protected readonly shownLinks = computed(() => {
    const links = this.value().links;
    const added = this.addedLinks();
    return LINK_FIELDS.filter(({field}) => links[field] || added.includes(field));
  });
  protected readonly addableLinks = computed(() =>
    LINK_FIELDS.filter(link => !this.shownLinks().includes(link)));

  protected readonly primaryLabel = computed(() => {
    const value = this.value();
    if (this.isLive()) return 'Save changes';
    if (value.visibility === 'PRIVATE') return 'Save draft';
    return `Publish ${value.version.trim() || 'release'}`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // start once the app is known; for an existing release also once it is loaded
    effect(() => {
      const app = this.context.app();
      if (!app || untracked(this.ready)) return;
      untracked(() => this.init(app));
    });

    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.controls.title.dirty) this.titleFollowsVersion = false;
    });
    this.form.controls.version.valueChanges.pipe(takeUntilDestroyed()).subscribe(version => {
      const app = this.context.app();
      if (this.titleFollowsVersion && app) {
        this.form.controls.title.setValue(`${app.name} ${version.trim()}`.trim(), {emitEvent: false});
      }
    });
    this.form.controls.visibility.valueChanges.pipe(takeUntilDestroyed()).subscribe(visibility => {
      if (visibility === 'PRIVATE') this.form.controls.push.setValue(false);
    });

    this.form.valueChanges.pipe(debounceTime(LOCAL_SAVE_DELAY_MS), takeUntilDestroyed()).subscribe(() => {
      if (this.ready() && this.form.dirty) this.saveLocally();
    });
    destroyRef.onDestroy(() => {
      if (this.ready() && this.form.dirty) this.saveLocally();
    });
  }

  // lifecycle of the page

  private init(app: AppSummary) {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    this.releaseId.set(id);

    const query = this.route.snapshot.queryParamMap;
    const promoteId = Number(query.get('promote')) || null;

    const release$: Observable<Changelogs | null> = id !== null
      ? this.changelogs.getById(id).pipe(map(response => response.body))
      : of(null);
    const promoted$: Observable<Changelogs | null> = promoteId !== null
      ? this.changelogs.getById(promoteId).pipe(map(response => response.body))
      : of(null);

    forkJoin({
      release: release$,
      promoted: promoted$,
      suggestions: this.console.linkSuggestions(app.slug),
      releases: this.changelogs.list({app: app.slug}).pipe(map(page => page.items)),
    }).subscribe(({release, promoted, suggestions, releases}) => {
      this.suggestions.set(suggestions);
      this.allReleases.set(releases);

      if (release) {
        this.stored.set(release);
        this.fill(release);
        this.titleFollowsVersion = false;
      } else {
        this.startNew(app, suggestions, promoted, query.get('channel'));
      }

      this.form.markAsPristine();
      this.ready.set(true);
      this.offerLocalDraft();
    });
  }

  private startNew(app: AppSummary, suggestions: LinkSuggestion[], promoted: Changelogs | null, channel: string | null) {
    const options = this.channelOptions();
    const main = options.find(name => channelKind(name) === 'stable') ?? options[0];

    // store links rarely change, so they come over from the last release; a new file usually does not
    const links = Object.fromEntries(suggestions
      .filter(suggestion => suggestion.field !== 'appUrl')
      .map(suggestion => [suggestion.field, suggestion.url]));

    if (promoted) {
      // promoting a beta: same notes and links, the plain version, the main channel
      this.form.patchValue({
        version: (promoted.version ?? '').split('-')[0],
        channel: main,
        description: promoted.description ?? '',
        content: promoted.content ?? '',
        imageUrl: promoted.imageUrl ?? '',
        links: {...links, ...pickLinks(promoted)},
      });
      return;
    }

    const preferred = channel && options.includes(channel) ? channel : main;
    const suggestion = this.versionSuggestions().find(next =>
      next.kind === (channelKind(preferred) === 'beta' ? 'beta' : 'stable'));
    this.form.patchValue({
      channel: preferred,
      version: suggestion?.version ?? '',
      content: NOTES_TEMPLATE,
      links,
    });
    this.form.controls.title.setValue(`${app.name} ${suggestion?.version ?? ''}`.trim());
  }

  private fill(release: Changelogs) {
    this.form.patchValue({
      version: release.version ?? '',
      channel: release.channel ?? '',
      title: release.title ?? '',
      description: release.description ?? '',
      content: release.content ?? '',
      imageUrl: release.imageUrl === this.context.app()?.iconUrl ? '' : release.imageUrl ?? '',
      links: pickLinks(release),
      // a draft is opened to be published eventually: the choice starts at Public, like a new release
      visibility: release.visibility === 'PRIVATE' || !release.visibility ? 'PUBLIC' : release.visibility as Visibility,
      push: release.visibility === 'PRIVATE' || !release.visibility,
      publishedAt: release.visibility === 'PRIVATE' || !release.publishedAt
        ? today() : String(release.publishedAt).substring(0, 10),
    });
    this.customChannel.set(!this.channelOptions().includes(release.channel ?? ''));
  }

  // version, channel, notes

  protected pickVersion(suggestion: VersionSuggestion) {
    const channel = this.channelOptions().find(name => channelKind(name) === suggestion.kind);
    this.form.patchValue({version: suggestion.version, ...(channel ? {channel} : {})});
    this.form.markAsDirty();
  }

  protected pickChannel(channel: string) {
    this.customChannel.set(false);
    this.form.controls.channel.setValue(channel);
    this.form.markAsDirty();
  }

  protected useCustomChannel() {
    this.customChannel.set(true);
    this.form.controls.channel.setValue('');
  }

  protected async insertTemplate() {
    const content = this.form.controls.content.value.trim();
    if (content && !await this.confirm.ask({
      title: 'Replace the release notes?',
      message: 'The notes you wrote are replaced by the empty New Features / Changes / Fixes template.',
      confirmLabel: 'Replace', danger: true,
    })) return;
    this.form.controls.content.setValue(NOTES_TEMPLATE);
    this.form.markAsDirty();
  }

  protected async copyNotes() {
    const source = this.copySource();
    if (!source) return;
    if (this.form.controls.content.value.trim() && this.form.controls.content.value !== NOTES_TEMPLATE && !await this.confirm.ask({
      title: `Copy the notes of ${source.version}?`,
      message: 'The notes you wrote are replaced.',
      confirmLabel: 'Copy notes', danger: true,
    })) return;
    this.changelogs.getById(source.id).subscribe(response => {
      this.form.controls.content.setValue(response.body?.content ?? '');
      if (!this.form.controls.description.value) {
        this.form.controls.description.setValue(response.body?.description ?? '');
      }
      this.form.markAsDirty();
    });
  }

  // links and uploads

  protected suggestionFor(field: LinkField) {
    return this.suggestions().find(suggestion => suggestion.field === field) ?? null;
  }

  protected addLink(field: LinkField) {
    this.addedLinks.update(fields => [...fields, field]);
    const suggestion = this.suggestionFor(field);
    if (suggestion && field !== 'appUrl') this.form.controls.links.controls[field].setValue(suggestion.url);
    this.form.markAsDirty();
  }

  protected removeLink(field: LinkField) {
    this.addedLinks.update(fields => fields.filter(other => other !== field));
    this.form.controls.links.controls[field].setValue('');
    this.form.markAsDirty();
  }

  protected useLastFile() {
    const suggestion = this.suggestionFor('appUrl');
    if (!suggestion) return;
    this.form.controls.links.controls.appUrl.setValue(suggestion.url);
    this.form.markAsDirty();
  }

  protected fileName(url: string) {
    return decodeURIComponent(url.split('/').pop() ?? url);
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!isInstallerFile(file)) {
      this.toast.error(INSTALLER_FILE_HINT);
      return;
    }
    this.uploading.set('file');
    this.files.uploadApp(file).subscribe({
      next: response => {
        this.form.controls.links.controls.appUrl.setValue(response.url);
        this.form.markAsDirty();
        this.uploading.set(null);
        this.toast.success(`${file.name} uploaded.`);
      },
      error: () => this.uploading.set(null),
    });
  }

  protected onCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!isImageFile(file)) {
      this.toast.error(IMAGE_FILE_HINT);
      return;
    }
    this.uploading.set('cover');
    this.files.uploadImage(file).subscribe({
      next: response => {
        this.form.controls.imageUrl.setValue(response.url);
        this.form.markAsDirty();
        this.uploading.set(null);
        this.toast.success('Cover image uploaded.');
      },
      error: () => this.uploading.set(null),
    });
  }

  protected removeCover() {
    this.form.controls.imageUrl.setValue('');
    this.form.markAsDirty();
  }

  // saving

  /** The primary button: saves with the chosen visibility and sends the push if asked to. */
  protected submit() {
    this.save(this.form.controls.visibility.value);
  }

  protected saveAsDraft() {
    this.save('PRIVATE');
  }

  private save(visibility: Visibility) {
    this.form.markAllAsTouched();
    if (this.blocked() || this.saving()) return;

    const app = this.context.app()!;
    const value = this.form.getRawValue();
    const request: Changelogs = {
      ...(this.stored() ?? {}),
      id: this.releaseId() ?? 0,
      appId: app.id,
      app: app.name,
      version: value.version.trim(),
      channel: value.channel.trim(),
      title: value.title.trim(),
      description: value.description.trim(),
      content: value.content,
      imageUrl: value.imageUrl.trim() || app.iconUrl || '',
      ...Object.fromEntries(LINK_FIELDS.map(({field}) => [field, value.links[field].trim()])),
      visibility,
      publishedAt: value.publishedAt as unknown as Date,
    };
    const push = value.push && visibility !== 'PRIVATE';

    this.saving.set(true);
    const save$ = this.isNew() ? this.changelogs.create(request) : this.changelogs.update(request);
    save$.pipe(
      map(response => response.body!),
      switchMap(saved => push
        ? this.changelogs.sendPush([saved.id!]).pipe(map(() => saved))
        : of(saved)),
    ).subscribe({
      next: saved => {
        this.saving.set(false);
        this.discardLocalDraft();
        this.form.markAsPristine();
        this.context.refresh().subscribe();
        this.toast.success(savedMessage(saved, visibility, push, this.isNew()));

        if (visibility === 'PRIVATE') {
          // a draft stays open for more work, now under its own address
          this.stored.set(saved);
          if (this.isNew()) {
            this.releaseId.set(saved.id!);
            this.router.navigate(['/apps', app.slug, 'releases', saved.id], {replaceUrl: true});
          }
        } else {
          this.router.navigate(['/apps', app.slug, 'releases']);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  protected async deleteRelease() {
    const stored = this.stored();
    if (!stored) return;
    const ok = await this.confirm.ask({
      title: `Delete ${stored.version}?`,
      message: `“${stored.title}” is removed from the website and the app. This cannot be undone.`,
      confirmLabel: 'Delete release', danger: true,
    });
    if (!ok) return;
    this.changelogs.deleteById(stored.id!).subscribe(() => {
      this.discardLocalDraft();
      this.form.markAsPristine();
      this.context.refresh().subscribe();
      this.toast.success(`${stored.version} deleted.`);
      this.router.navigate(['/apps', this.context.slug(), 'releases']);
    });
  }

  // unsaved work

  async canLeave(): Promise<boolean> {
    if (!this.form.dirty || this.saving()) return true;
    this.saveLocally();
    return this.confirm.ask({
      title: 'Leave without saving?',
      message: 'Your changes are kept in this browser and offered again when you come back to this release.',
      confirmLabel: 'Leave',
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent) {
    if (this.form.dirty) {
      this.saveLocally();
      event.preventDefault();
    }
  }

  protected localSaveText() {
    const savedAt = this.localSavedAt();
    if (!savedAt) return this.form.dirty ? 'unsaved changes' : '';
    const seconds = Math.round((Date.now() - savedAt) / 1000);
    return `kept in this browser ${seconds < 60 ? 'just now' : this.draftAge(savedAt)}`;
  }

  protected restoreLocalDraft() {
    const draft = this.restorable();
    if (!draft) return;
    try {
      this.form.setValue(draft.value);
    } catch {
      // saved by an older version of this page with other fields
      this.toast.error('These changes can not be restored anymore.');
      this.discardLocalDraft();
      return;
    }
    this.addedLinks.set(LINK_FIELDS.map(({field}) => field).filter(field => draft.value.links[field]));
    this.titleFollowsVersion = false;
    this.form.markAsDirty();
    this.restorable.set(null);
    this.toast.info('Your unsaved changes are back.');
  }

  protected discardLocalDraft() {
    this.restorable.set(null);
    this.localSavedAt.set(null);
    try {
      localStorage.removeItem(this.localKey());
    } catch {
      // storage may be blocked; there is nothing to clean up then
    }
  }

  private localKey() {
    return `${LOCAL_DRAFT_PREFIX}${this.context.slug()}:${this.releaseId() ?? 'new'}`;
  }

  private saveLocally() {
    const draft: LocalDraft = {savedAt: Date.now(), value: this.form.getRawValue()};
    try {
      localStorage.setItem(this.localKey(), JSON.stringify(draft));
      this.localSavedAt.set(draft.savedAt);
    } catch {
      // full or blocked storage: the leave warning still protects the work
    }
  }

  private offerLocalDraft() {
    try {
      const raw = localStorage.getItem(this.localKey());
      if (!raw) return;
      const draft = JSON.parse(raw) as LocalDraft;
      const same = JSON.stringify(draft.value) === JSON.stringify(this.form.getRawValue());
      if (same) localStorage.removeItem(this.localKey()); else this.restorable.set(draft);
    } catch {
      // unreadable leftovers are simply ignored
    }
  }

  protected draftAge(savedAt: number) {
    const minutes = Math.round((Date.now() - savedAt) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    return relativeDay(new Date(savedAt)).toLowerCase();
  }
}

function pickLinks(release: Changelogs): Partial<Record<LinkField, string>> {
  return Object.fromEntries(LINK_FIELDS
    .map(({field}) => [field, (release as Record<string, unknown>)[field]])
    .filter(([, url]) => typeof url === 'string' && url)) as Partial<Record<LinkField, string>>;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function savedMessage(saved: Changelogs, visibility: Visibility, push: boolean, created: boolean) {
  if (visibility === 'PRIVATE') return created ? `Draft ${saved.version} saved.` : 'Draft saved.';
  const where = visibility === 'PUBLIC' ? 'public' : 'unlisted';
  return `${saved.version} is ${where} now${push ? ' and the push is out' : ''}.`;
}
