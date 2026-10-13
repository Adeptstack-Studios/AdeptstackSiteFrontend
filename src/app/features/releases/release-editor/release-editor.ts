import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {forkJoin, map, Observable, of} from 'rxjs';
import {ArrowLeft, CircleAlert, Download, LucideAngularModule, Plus, Trash2, Upload, X} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ChangelogsService} from '../../../services/changelogs-service';
import {ConsoleService} from '../../../services/console-service';
import {FileService} from '../../../services/file-service';
import {Changelogs} from '../../../models/changelogs';
import {AppSummary, LINK_FIELDS, LinkField, LinkSuggestion} from '../../../models/console';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {channelKind, suggestVersions, VersionSuggestion} from '../../../shared/versions';
import {INSTALLER_FILE_HINT, isInstallerFile} from '../../../shared/listing/upload-files';
import {AppTile} from '../../../shared/ui/app-tile';
import {EditorPage} from '../../../shared/editor/editor-page';
import {MarkdownEditor} from '../../../shared/editor/markdown-editor';
import {ComingSoon, PublishingCard, PublishWhen} from '../../../shared/editor/publishing-card';
import {ChecksCard, hasBlockingCheck} from '../../../shared/editor/checks-card';
import {CoverCard} from '../../../shared/editor/cover-card';
import {checkRelease, NOTES_TEMPLATE, ReleaseDraft} from './release-checks';
import {EditOnly} from '../../../shared/ui/edit-only';
import {ReviewService} from '../../../services/review-service';
import {ReviewDetail, submittedReview} from '../../../models/review';
import {ReviewBanner} from '../../../shared/review/review-banner';
import {CurrentUser} from '../../../core/auth/current-user';
import {isAhead, localInputDay, localInputToIso, nowLocalInput, toLocalInput} from '../../../shared/time';

/** Channel names for an app without releases. */
const DEFAULT_CHANNELS = {stable: 'stable', beta: 'beta'};

function releaseForm() {
  return new FormGroup({
    version: new FormControl('', {nonNullable: true, validators: Validators.required}),
    channel: new FormControl('', {nonNullable: true, validators: Validators.required}),
    title: new FormControl('', {nonNullable: true, validators: Validators.required}),
    description: new FormControl('', {nonNullable: true, validators: Validators.required}),
    content: new FormControl('', {nonNullable: true, validators: Validators.required}),
    imageUrl: new FormControl('', {nonNullable: true}),
    links: new FormGroup(Object.fromEntries(LINK_FIELDS.map(({field}) =>
      [field, new FormControl('', {nonNullable: true})])) as Record<LinkField, FormControl<string>>),
    visibility: new FormControl<Visibility>('PUBLIC', {nonNullable: true}),
    /** the release moment, a datetime-local value */
    publishedAt: new FormControl(nowLocalInput(), {nonNullable: true, validators: Validators.required}),
    when: new FormControl<PublishWhen>('now', {nonNullable: true}),
    comingSoon: new FormControl<ComingSoon>('off', {nonNullable: true}),
    comingSoonAt: new FormControl('', {nonNullable: true}),
    comingSoonPushOn: new FormControl(true, {nonNullable: true}),
    comingSoonPush: new FormControl('', {nonNullable: true}),
    push: new FormControl(true, {nonNullable: true}),
    pushText: new FormControl('', {nonNullable: true}),
  });
}

type ReleaseFormValue = ReturnType<ReturnType<typeof releaseForm>['getRawValue']>;

/** Creates and edits releases of the open app: /apps/:slug/releases/new and /apps/:slug/releases/:id */
@Component({
  selector: 'app-release-editor',
  imports: [ReactiveFormsModule, RouterLink, CdkMenuTrigger, CdkMenu, CdkMenuItem, LucideAngularModule, AppTile,
    MarkdownEditor, PublishingCard, ChecksCard, CoverCard, EditOnly, ReviewBanner],
  templateUrl: './release-editor.html',
  styleUrl: './release-editor.css'
})
export class ReleaseEditor extends EditorPage<ReleaseFormValue> {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changelogs = inject(ChangelogsService);
  private readonly reviews = inject(ReviewService);
  private readonly currentUser = inject(CurrentUser);
  private readonly console = inject(ConsoleService);
  private readonly files = inject(FileService);
  protected readonly context = inject(AppContext);

  protected readonly icons = {ArrowLeft, CircleAlert, Download, Plus, Trash2, Upload, X};
  protected readonly linkFields = LINK_FIELDS;

  /** null for a new release */
  protected readonly releaseId = signal<number | null>(null);
  /** the release as stored, for an existing one */
  protected readonly stored = signal<Changelogs | null>(null);
  /** a change of it waiting for review, or sent back */
  protected readonly openReview = signal<ReviewDetail | null>(null);
  private readonly myReview = computed(() => this.openReview()?.review.author === this.currentUser.user()?.username);
  /** someone else's change waits for review: only they can change this entry until then */
  protected readonly lockedByOther = computed(() => !!this.openReview() && !this.myReview());
  protected readonly uploadingFile = signal(false);
  protected readonly suggestions = signal<LinkSuggestion[]>([]);
  /** every release of the app, for duplicate and "higher than" checks */
  private readonly allReleases = signal<Changelogs[]>([]);
  /** link rows shown even while empty, because they were added */
  protected readonly addedLinks = signal<LinkField[]>([]);
  protected readonly customChannel = signal(false);
  /** the title follows the version until it is edited by hand */
  private titleFollowsVersion = true;

  readonly form = releaseForm();

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
  protected readonly blocked = computed(() => hasBlockingCheck(this.checks()));

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

  /** a draft that stays private is saved; everything that touches the website is reviewed first */
  protected readonly primaryLabel = computed(() => {
    if (this.lockedByOther()) return 'Waiting for review';
    const value = this.value();
    if (!this.isLive() && value.visibility === 'PRIVATE') return 'Save draft';
    if (this.myReview()) return 'Submit again';
    return value.when === 'plan' ? 'Submit plan for review' : 'Submit for review';
  });

  /** an app without a release out yet is announced by name, later releases by version */
  private readonly firstRelease = computed(() => (this.context.app()?.channels ?? []).length === 0);

  protected suggestedComingSoonPush(version: string) {
    const app = this.context.app()?.name ?? '';
    return this.firstRelease() ? `👀 ${app} is coming soon!` : `👀 ${app} ${version.trim() || '…'} is coming soon!`;
  }

  protected suggestedReleasePush(version: string) {
    const app = this.context.app()?.name ?? '';
    return this.firstRelease() ? `🚀 ${app} is OUT NOW! 🔥` : `🚀 ${app} v${version.trim() || '…'} is OUT NOW! 🔥`;
  }

  constructor() {
    super();

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
      // the push texts follow the version until they are written by hand
      if (!this.form.controls.pushText.dirty) this.form.controls.pushText.setValue(this.suggestedReleasePush(version), {emitEvent: false});
      if (!this.form.controls.comingSoonPush.dirty) {
        this.form.controls.comingSoonPush.setValue(this.suggestedComingSoonPush(version), {emitEvent: false});
      }
      const app = this.context.app();
      if (this.titleFollowsVersion && app) {
        this.form.controls.title.setValue(`${app.name} ${version.trim()}`.trim(), {emitEvent: false});
      }
    });
    this.form.controls.visibility.valueChanges.pipe(takeUntilDestroyed()).subscribe(visibility => {
      if (visibility === 'PRIVATE') this.form.controls.push.setValue(false);
    });

    this.keepDrafts();
  }

  protected draftKey() {
    return `release-draft:${this.context.slug()}:${this.releaseId() ?? 'new'}`;
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
      review: id !== null ? this.reviews.openFor('RELEASE', id) : of(null),
      promoted: promoted$,
      suggestions: this.console.linkSuggestions(app.slug),
      releases: this.changelogs.list({app: app.slug}).pipe(map(page => page.items)),
    }).subscribe(({release, review, promoted, suggestions, releases}) => {
      this.suggestions.set(suggestions);
      this.allReleases.set(releases);
      this.openReview.set(review);

      if (release) {
        this.stored.set(release);
        // the author goes on with what they submitted, not with the live version
        if (review?.payload && this.myReview()) {
          this.fill({...release, ...review.payload} as Changelogs);
          // a plan carries its push in the payload, not as "push right away"
          this.form.controls.push.setValue(review.review.push || !!review.payload['releasePush']);
        } else {
          this.fill(release);
        }
        this.titleFollowsVersion = false;
      } else {
        this.startNew(app, suggestions, promoted, query.get('channel'));
      }
      this.loaded();
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
    const draft = release.visibility === 'PRIVATE' || !release.visibility;
    const moment = release.releaseAt || (release.publishedAt ? String(release.publishedAt).substring(0, 10) : null);
    // a stored plan (PLANNED, COMING_SOON) or a submitted one (true)
    const planned = !!release.plan;
    this.form.patchValue({
      version: release.version ?? '',
      channel: release.channel ?? '',
      title: release.title ?? '',
      description: release.description ?? '',
      content: release.content ?? '',
      imageUrl: release.imageUrl === this.context.app()?.iconUrl ? '' : release.imageUrl ?? '',
      links: pickLinks(release),
      // a draft is opened to be published eventually: the choice starts at Public, like a new release
      visibility: draft ? 'PUBLIC' : release.visibility as Visibility,
      push: draft || !!release.releasePush,
      // a draft keeps a moment ahead (a plan), otherwise it starts at now
      publishedAt: draft && !isAhead(toLocalInput(moment)) ? nowLocalInput() : toLocalInput(moment),
      when: planned ? 'plan' : 'now',
      comingSoon: !planned || !release.comingSoonAt ? 'off' : isAhead(toLocalInput(release.comingSoonAt)) ? 'at' : 'now',
      comingSoonAt: toLocalInput(release.comingSoonAt),
      comingSoonPushOn: !planned || !!release.comingSoonPush,
      comingSoonPush: release.comingSoonPush || this.suggestedComingSoonPush(release.version ?? ''),
      pushText: release.releasePush || this.suggestedReleasePush(release.version ?? ''),
    });
    this.form.controls.pushText.markAsPristine();
    this.form.controls.comingSoonPush.markAsPristine();
    if (release.releasePush) this.form.controls.pushText.markAsDirty();
    if (release.comingSoonPush) this.form.controls.comingSoonPush.markAsDirty();
    this.customChannel.set(!this.channelOptions().includes(release.channel ?? ''));
  }

  protected override restoreDraft() {
    const value = super.restoreDraft();
    if (value) {
      this.addedLinks.set(LINK_FIELDS.map(({field}) => field).filter(field => value.links[field]));
      this.titleFollowsVersion = false;
    }
    return value;
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

  // links and the installer

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
    this.uploadingFile.set(true);
    this.files.uploadApp(file).subscribe({
      next: response => {
        this.form.controls.links.controls.appUrl.setValue(response.url);
        this.form.markAsDirty();
        this.uploadingFile.set(false);
        this.toast.success(`${file.name} uploaded.`);
      },
      error: () => this.uploadingFile.set(false),
    });
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
      publishedAt: localInputDay(value.publishedAt) as unknown as Date,
      releaseAt: localInputToIso(value.publishedAt),
      ...planFields(value, visibility),
    };
    // a plan sends its pushes itself, at coming soon and at the release
    const push = value.push && visibility !== 'PRIVATE' && value.when !== 'plan';

    this.saving.set(true);
    const save$ = this.isNew() ? this.changelogs.create(request, push) : this.changelogs.update(request, push);
    save$.subscribe({
      next: response => {
        this.saving.set(false);
        this.settled();
        this.context.refresh().subscribe();
        const review = submittedReview(response);
        if (review) {
          this.reviews.refreshCounts();
          this.toast.success(`${request.version} is submitted for review. It goes live once an owner approves it.`);
          if (this.isNew()) {
            // stored as a private draft meanwhile, under its own address
            this.router.navigate(['/apps', app.slug, 'releases', review.targetId], {replaceUrl: true});
          } else {
            this.reloadReview();
          }
          return;
        }

        const saved = response.body!;
        this.toast.success(this.isNew() ? `Draft ${saved.version} saved.` : 'Draft saved.');
        // saving privately takes back an own submission
        this.openReview.set(null);
        this.stored.set(saved);
        if (this.isNew()) {
          this.releaseId.set(saved.id!);
          this.router.navigate(['/apps', app.slug, 'releases', saved.id], {replaceUrl: true});
        }
      },
      error: () => this.saving.set(false),
    });
  }

  /** After submitting or withdrawing: the stored release and its open review as they are now. */
  protected reloadReview() {
    const id = this.releaseId();
    if (id === null) return;
    forkJoin({
      release: this.changelogs.getById(id).pipe(map(response => response.body)),
      review: this.reviews.openFor('RELEASE', id),
    }).subscribe(({release, review}) => {
      this.stored.set(release);
      this.openReview.set(review);
    });
  }

  protected async deleteRelease() {
    const stored = this.stored();
    if (!stored) return;
    const ok = await this.confirm.ask({
      title: `Delete ${stored.version}?`,
      message: stored.visibility === 'PRIVATE'
        ? `The draft “${stored.title}” is deleted. This cannot be undone.`
        : `“${stored.title}” is live, so deleting it is submitted for review first. Once approved it is removed from the website and the app.`,
      confirmLabel: stored.visibility === 'PRIVATE' ? 'Delete release' : 'Submit deletion', danger: true,
    });
    if (!ok) return;
    this.changelogs.deleteById(stored.id!).subscribe(response => {
      this.settled();
      this.context.refresh().subscribe();
      if (submittedReview(response)) {
        this.reviews.refreshCounts();
        this.toast.success(`Deleting ${stored.version} is submitted for review. It stays live until an owner approves.`);
      } else {
        this.toast.success(`${stored.version} deleted.`);
      }
      this.router.navigate(['/apps', this.context.slug(), 'releases']);
    });
  }
}

/** What a plan adds to the request; nothing for a draft or publishing right away (besides the push text). */
function planFields(value: ReleaseFormValue, visibility: Visibility): Partial<Changelogs> {
  const releasePush = value.push ? value.pushText.trim() || null : null;
  if (visibility === 'PRIVATE' || value.when !== 'plan') {
    return {plan: false, comingSoonAt: null, comingSoonPush: null, releasePush: visibility === 'PRIVATE' ? null : releasePush};
  }
  const comingSoonAt = value.comingSoon === 'now' ? new Date().toISOString()
    : value.comingSoon === 'at' ? localInputToIso(value.comingSoonAt) : null;
  return {
    plan: true,
    comingSoonAt,
    comingSoonPush: comingSoonAt && value.comingSoonPushOn ? value.comingSoonPush.trim() || null : null,
    releasePush,
  };
}

function pickLinks(release: Changelogs): Partial<Record<LinkField, string>> {
  return Object.fromEntries(LINK_FIELDS
    .map(({field}) => [field, (release as Record<string, unknown>)[field]])
    .filter(([, url]) => typeof url === 'string' && url)) as Partial<Record<LinkField, string>>;
}

