import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {ArrowLeft, ArrowUpRight, CircleAlert, LucideAngularModule, Trash2} from 'lucide-angular';
import {NewsService} from '../../../services/news-service';
import {ConsoleService} from '../../../services/console-service';
import {News} from '../../../models/news';
import {AppSummary} from '../../../models/console';
import {Facet} from '../../../models/listing';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {slugify} from '../../../shared/slug';
import {EditorPage, today} from '../../../shared/editor/editor-page';
import {MarkdownEditor} from '../../../shared/editor/markdown-editor';
import {PublishingCard} from '../../../shared/editor/publishing-card';
import {ChecksCard, hasBlockingCheck} from '../../../shared/editor/checks-card';
import {CoverCard} from '../../../shared/editor/cover-card';
import {checkPost} from './post-checks';

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
    publishedAt: new FormControl(today(), {nonNullable: true, validators: Validators.required}),
    push: new FormControl(false, {nonNullable: true}),
  });
}

type PostFormValue = ReturnType<ReturnType<typeof postForm>['getRawValue']>;

/** Writes and edits blog posts: /blog/new and /blog/:id */
@Component({
  selector: 'app-post-editor',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, MarkdownEditor, PublishingCard, ChecksCard, CoverCard],
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
  protected readonly checks = computed(() => checkPost(this.value(), this.takenSlugs()));
  protected readonly blocked = computed(() => hasBlockingCheck(this.checks()));

  protected readonly primaryLabel = computed(() => {
    if (this.isLive()) return 'Save changes';
    return this.value().visibility === 'PRIVATE' ? 'Save draft' : 'Publish post';
  });

  constructor() {
    super();
    this.form.controls.slug.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.controls.slug.dirty) this.slugFollowsTitle = false;
    });
    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe(title => {
      if (this.slugFollowsTitle) this.form.controls.slug.setValue(slugify(title), {emitEvent: false});
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
      apps: this.console.apps(),
      categories: this.news.categories(),
      posts: this.news.list({}).pipe(map(page => page.items)),
    }).subscribe(({post, apps, categories, posts}) => {
      this.apps.set([...apps].sort((a, b) => a.name.localeCompare(b.name)));
      this.categories.set(categories);
      this.takenSlugs.set(posts.filter(other => other.id !== id).map(other => other.slug ?? ''));

      if (post) {
        this.stored.set(post);
        this.fill(post);
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
      publishedAt: draft || !post.publishedAt ? today() : String(post.publishedAt).substring(0, 10),
    });
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
      publishedAt: value.publishedAt as unknown as Date,
    };
    const push = value.push && visibility !== 'PRIVATE';

    this.saving.set(true);
    const save$ = this.isNew() ? this.news.create(request) : this.news.update(request);
    save$.pipe(
      map(response => response.body!),
      switchMap(saved => push ? this.news.sendPush([saved.id!]).pipe(map(() => saved)) : of(saved)),
    ).subscribe({
      next: saved => {
        this.saving.set(false);
        this.settled();
        this.toast.success(visibility === 'PRIVATE'
          ? 'Draft saved.'
          : `“${saved.title}” is ${visibility.toLowerCase()} now${push ? ' and the push is out' : ''}.`);

        if (visibility === 'PRIVATE') {
          this.stored.set(saved);
          if (this.isNew()) {
            this.postId.set(saved.id!);
            this.router.navigate(['/blog', saved.id], {replaceUrl: true});
          }
        } else {
          this.router.navigate(['/blog']);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  protected async deletePost() {
    const stored = this.stored();
    if (!stored) return;
    const ok = await this.confirm.ask({
      title: 'Delete this post?',
      message: `“${stored.title}” is removed from the website and the app. This cannot be undone.`,
      confirmLabel: 'Delete post', danger: true,
    });
    if (!ok) return;
    this.news.deleteById(stored.id!).subscribe(() => {
      this.settled();
      this.toast.success('Post deleted.');
      this.router.navigate(['/blog']);
    });
  }
}
