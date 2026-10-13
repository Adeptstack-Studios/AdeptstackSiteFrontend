import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {forkJoin, map, Observable, of} from 'rxjs';
import {ArrowLeft, ArrowUpRight, CircleAlert, LucideAngularModule, Trash2} from 'lucide-angular';
import {NewsService} from '../../../services/news-service';
import {ConsoleService} from '../../../services/console-service';
import {News} from '../../../models/news';
import {AppSummary} from '../../../models/console';
import {Facet} from '../../../models/listing';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {slugify} from '../../../shared/slug';
import {EditorPage} from '../../../shared/editor/editor-page';
import {MarkdownEditor} from '../../../shared/editor/markdown-editor';
import {PublishingCard, PublishWhen} from '../../../shared/editor/publishing-card';
import {ChecksCard, hasBlockingCheck} from '../../../shared/editor/checks-card';
import {CoverCard} from '../../../shared/editor/cover-card';
import {checkPost} from './post-checks';
import {EditOnly} from '../../../shared/ui/edit-only';
import {ReviewService} from '../../../services/review-service';
import {ReviewDetail, submittedReview} from '../../../models/review';
import {ReviewBanner} from '../../../shared/review/review-banner';
import {CurrentUser} from '../../../core/auth/current-user';
import {isAhead, localInputDay, localInputToIso, nowLocalInput, toLocalInput} from '../../../shared/time';

function postForm() {
  return new FormGroup({
    title: new FormControl('', {nonNullable: true, validators: Validators.required}),
    slug: new FormControl('', {nonNullable: true}),
    category: new FormControl('', {nonNullable: true, validators: Validators.required}),
    description: new FormControl('', {nonNullable: true, validators: Validators.required}),
    /** '' for no app; a select gives strings */
    appId: new FormControl('', {nonNullable: true}),
    content: new FormControl('', {nonNullable: true, validators: Validators.required}),
    imageUrl: new FormControl('', {nonNullable: true}),
    visibility: new FormControl<Visibility>('PUBLIC', {nonNullable: true}),
    /** the publish moment, a datetime-local value */
    publishedAt: new FormControl(nowLocalInput(), {nonNullable: true, validators: Validators.required}),
    when: new FormControl<PublishWhen>('now', {nonNullable: true}),
    push: new FormControl(false, {nonNullable: true}),
    pushText: new FormControl('', {nonNullable: true}),
  });
}

type PostFormValue = ReturnType<ReturnType<typeof postForm>['getRawValue']>;

/** Writes and edits blog posts: /blog/new and /blog/:id */
@Component({
  selector: 'app-post-editor',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, MarkdownEditor, PublishingCard, ChecksCard, CoverCard, EditOnly, ReviewBanner],
  templateUrl: './post-editor.html',
  styles: `
    .fields-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .field {
      margin-top: 14px;
    }

    .slug {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .site-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    @media (max-width: 760px) {
      .fields-2 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `
})
export class PostEditor extends EditorPage<PostFormValue> {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly news = inject(NewsService);
  private readonly reviews = inject(ReviewService);
  private readonly currentUser = inject(CurrentUser);
  private readonly console = inject(ConsoleService);

  protected readonly icons = {ArrowLeft, ArrowUpRight, CircleAlert, Trash2};

  /** null for a new post */
  protected readonly postId = signal<number | null>(null);
  /** the post as stored, for an existing one */
  protected readonly stored = signal<News | null>(null);
  protected readonly apps = signal<AppSummary[]>([]);
  protected readonly categories = signal<Facet[]>([]);
  /** addresses of all other posts, to warn before a number gets added */
  private readonly takenSlugs = signal<string[]>([]);
  /** the address follows the title until it is edited by hand; a saved one never changes by itself */
  private slugFollowsTitle = true;

  readonly form = postForm();
  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {initialValue: this.form.getRawValue()});

  protected readonly isNew = computed(() => this.postId() === null);
  protected readonly isLive = computed(() => !!this.stored() && this.stored()!.visibility !== 'PRIVATE');
  /** a change of it waiting for review, or sent back */
  protected readonly openReview = signal<ReviewDetail | null>(null);
  private readonly myReview = computed(() => this.openReview()?.review.author === this.currentUser.user()?.username);
  /** someone else's change waits for review: only they can change this entry until then */
  protected readonly lockedByOther = computed(() => !!this.openReview() && !this.myReview());
  protected readonly checks = computed(() => {
    const checks = checkPost(this.value(), this.takenSlugs());
    const problem = this.planProblem();
    return problem ? [...checks, {ok: false, severity: 'error' as const, text: problem}] : checks;
  });
  protected readonly blocked = computed(() => hasBlockingCheck(this.checks()));

  /** a draft that stays private is saved; everything that touches the website is reviewed first */
  protected readonly primaryLabel = computed(() => {
    if (this.lockedByOther()) return 'Waiting for review';
    const value = this.value();
    if (!this.isLive() && value.visibility === 'PRIVATE') return 'Save draft';
    if (this.myReview()) return 'Submit again';
    return value.when === 'plan' ? 'Submit plan for review' : 'Submit for review';
  });

  /** a plan needs a moment ahead; checked next to "Before you publish" */
  protected readonly planProblem = computed(() => {
    const value = this.value();
    return value.visibility !== 'PRIVATE' && value.when === 'plan' && !isAhead(value.publishedAt)
      ? 'A plan needs a publish moment that lies ahead' : null;
  });

  constructor() {
    super();
    this.form.controls.slug.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.controls.slug.dirty) this.slugFollowsTitle = false;
    });
    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe(title => {
      if (this.slugFollowsTitle) this.form.controls.slug.setValue(slugify(title), {emitEvent: false});
      // the push text follows the title until it is written by hand
      if (!this.form.controls.pushText.dirty) this.form.controls.pushText.setValue(`🚀 ${title.trim() || '…'} 🔥`, {emitEvent: false});
    });
    this.form.controls.visibility.valueChanges.pipe(takeUntilDestroyed()).subscribe(visibility => {
      if (visibility === 'PRIVATE') this.form.controls.push.setValue(false);
    });
    this.keepDrafts();
    this.init();
  }

  protected draftKey() {
    return `post-draft:${this.postId() ?? 'new'}`;
  }

  private init() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    this.postId.set(id);

    const post$: Observable<News | null> = id !== null
      ? this.news.getById(id).pipe(map(response => response.body))
      : of(null);

    forkJoin({
      post: post$,
      review: id !== null ? this.reviews.openFor('POST', id) : of(null),
      apps: this.console.apps(),
      categories: this.news.categories(),
      posts: this.news.list({}).pipe(map(page => page.items)),
    }).subscribe(({post, review, apps, categories, posts}) => {
      this.openReview.set(review);
      this.apps.set([...apps].sort((a, b) => a.name.localeCompare(b.name)));
      this.categories.set(categories);
      this.takenSlugs.set(posts.filter(other => other.id !== id).map(other => other.slug ?? ''));

      if (post) {
        this.stored.set(post);
        // the author goes on with what they submitted, not with the live version
        if (review?.payload && this.myReview()) {
          this.fill({...post, ...review.payload} as News);
          // a plan carries its push in the payload, not as "push right away"
          this.form.controls.push.setValue(review.review.push || !!review.payload['publishPush']);
        } else {
          this.fill(post);
        }
      } else {
        // "Link a post" on an app dashboard opens this with the app chosen
        const app = apps.find(other => other.slug === this.route.snapshot.queryParamMap.get('app'));
        if (app) this.form.controls.appId.setValue(String(app.id));
      }
      this.loaded();
    });
  }

  private fill(post: News) {
    const draft = post.visibility === 'PRIVATE' || !post.visibility;
    const moment = post.publishAt || (post.publishedAt ? String(post.publishedAt).substring(0, 10) : null);
    this.slugFollowsTitle = false;
    this.form.patchValue({
      title: post.title ?? '',
      slug: post.slug ?? '',
      category: post.category ?? '',
      description: post.description ?? '',
      appId: post.appId ? String(post.appId) : '',
      content: post.content ?? '',
      imageUrl: post.imageUrl ?? '',
      // a draft is opened to be published eventually: the choice starts at Public
      visibility: draft ? 'PUBLIC' : post.visibility as Visibility,
      // a draft keeps a moment ahead (a plan), otherwise it starts at now
      publishedAt: draft && !isAhead(toLocalInput(moment)) ? nowLocalInput() : toLocalInput(moment),
      when: post.plan ? 'plan' : 'now',
      push: !!post.publishPush,
      pushText: post.publishPush || `🚀 ${post.title ?? '…'} 🔥`,
    });
    if (post.publishPush) this.form.controls.pushText.markAsDirty();
    else this.form.controls.pushText.markAsPristine();
  }

  protected override restoreDraft() {
    const value = super.restoreDraft();
    if (value) this.slugFollowsTitle = false;
    return value;
  }

  protected websiteUrl() {
    const slug = this.stored()?.slug;
    return slug ? `https://adeptstack.net/blog/${slug}` : null;
  }

  // saving

  protected submit() {
    this.save(this.form.controls.visibility.value);
  }

  protected saveAsDraft() {
    this.save('PRIVATE');
  }

  private save(visibility: Visibility) {
    this.form.markAllAsTouched();
    if (this.blocked() || this.saving()) return;

    const value = this.form.getRawValue();
    const request: News = {
      ...(this.stored() ?? {}),
      id: this.postId() ?? 0,
      title: value.title.trim(),
      slug: value.slug.trim(),
      category: value.category.trim(),
      description: value.description.trim(),
      appId: value.appId ? Number(value.appId) : null,
      content: value.content,
      imageUrl: value.imageUrl.trim(),
      visibility,
      publishedAt: localInputDay(value.publishedAt) as unknown as Date,
      publishAt: localInputToIso(value.publishedAt),
      plan: visibility !== 'PRIVATE' && value.when === 'plan',
      publishPush: visibility !== 'PRIVATE' && value.push ? value.pushText.trim() || null : null,
    };
    // a plan sends its push itself, at the publish moment
    const push = value.push && visibility !== 'PRIVATE' && value.when !== 'plan';

    this.saving.set(true);
    const save$ = this.isNew() ? this.news.create(request, push) : this.news.update(request, push);
    save$.subscribe({
      next: response => {
        this.saving.set(false);
        this.settled();
        const review = submittedReview(response);
        if (review) {
          this.reviews.refreshCounts();
          this.toast.success(`“${request.title}” is submitted for review. It goes live once an owner approves it.`);
          if (this.isNew()) {
            // stored as a private draft meanwhile, under its own address
            this.router.navigate(['/blog', review.targetId], {replaceUrl: true});
          } else {
            this.reloadReview();
          }
          return;
        }

        const saved = response.body!;
        this.toast.success('Draft saved.');
        // saving privately takes back an own submission
        this.openReview.set(null);
        this.stored.set(saved);
        if (this.isNew()) {
          this.postId.set(saved.id!);
          this.router.navigate(['/blog', saved.id], {replaceUrl: true});
        }
      },
      error: () => this.saving.set(false),
    });
  }

  /** After submitting or withdrawing: the stored post and its open review as they are now. */
  protected reloadReview() {
    const id = this.postId();
    if (id === null) return;
    forkJoin({
      post: this.news.getById(id).pipe(map(response => response.body)),
      review: this.reviews.openFor('POST', id),
    }).subscribe(({post, review}) => {
      this.stored.set(post);
      this.openReview.set(review);
    });
  }

  protected async deletePost() {
    const stored = this.stored();
    if (!stored) return;
    const ok = await this.confirm.ask({
      title: 'Delete this post?',
      message: stored.visibility === 'PRIVATE'
        ? `The draft “${stored.title}” is deleted. This cannot be undone.`
        : `“${stored.title}” is live, so deleting it is submitted for review first. Once approved it is removed from the website and the app.`,
      confirmLabel: stored.visibility === 'PRIVATE' ? 'Delete post' : 'Submit deletion', danger: true,
    });
    if (!ok) return;
    this.news.deleteById(stored.id!).subscribe(response => {
      this.settled();
      if (submittedReview(response)) {
        this.reviews.refreshCounts();
        this.toast.success('Deleting the post is submitted for review. It stays live until an owner approves.');
      } else {
        this.toast.success('Post deleted.');
      }
      this.router.navigate(['/blog']);
    });
  }
}
