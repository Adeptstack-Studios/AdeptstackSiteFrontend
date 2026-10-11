import {Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Observable} from 'rxjs';
import {Changelogs} from '../models/changelogs';
import {News} from '../models/news';
import {DatePipe} from '@angular/common';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
import {MarkdownComponent} from 'ngx-markdown';
import {ConfirmService} from '../core/confirm/confirm-service';
import {Visibility, VisibilityPicker} from '../shared/visibility-picker/visibility-picker';
import {quietRequest} from '../core/errors/http-errors';

@Component({
  selector: 'app-post-modal',
  imports: [
    DatePipe,
    MarkdownComponent,
    VisibilityPicker
  ],
  templateUrl: './post-modal.html',
  styleUrl: '../shared/styles/detail-popup.css',
})
export class PostModal implements OnInit, OnChanges {

  @Input() post?: News | Changelogs;
  @Input() isNews: boolean = true;
  @Output() closeModal = new EventEmitter<void>();
  @Output() onEditPost = new EventEmitter<number>();

  private readonly newsService = inject(NewsService);
  private readonly changelogsService = inject(ChangelogsService);
  private readonly appService = inject(AppService);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  appName: string = '';

  ngOnInit() {
    this.loadAppName();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['post'] && !changes['post'].isFirstChange()) {
      this.loadAppName();
    }
  }

  private loadAppName() {
    if (!this.isNews && this.post && 'appId' in this.post && this.post.appId) {
      // only a subtitle: if the app is gone, the popup simply shows none
      this.appService.getById(this.post.appId, quietRequest()).subscribe({
        next: (response) => this.appName = response.body?.name || '',
        error: () => this.appName = ''
      });
    } else {
      this.appName = '';
    }
  }

  isSendingPush = false;
  isSendingNewsletter = false;

  /** Push and newsletter are triggered manually, never by making a post visible. */
  sendPush() {
    if (!this.post?.id || this.isSendingPush) return;

    this.isSendingPush = true;
    const request = this.isNews
      ? this.newsService.sendPush([this.post.id])
      : this.changelogsService.sendPush([this.post.id]);

    request.subscribe({
      next: (response) => {
        this.toastService.success(response.body || 'Push sent.');
        this.isSendingPush = false;
      },
      error: () => this.isSendingPush = false
    });
  }

  sendNewsletter() {
    if (!this.post?.id || this.isSendingNewsletter) return;

    this.isSendingNewsletter = true;
    this.newsService.sendNewsletter(this.post.id).subscribe({
      next: (response) => {
        this.toastService.success(response.body || 'Newsletter sent.');
        this.isSendingNewsletter = false;
      },
      error: () => this.isSendingNewsletter = false
    });
  }

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditPost.emit(<number>this.post?.id);
  }

  isSavingVisibility = false;

  get currentVisibility(): Visibility {
    return this.post?.visibility || 'PRIVATE';
  }

  setVisibility(next: Visibility) {
    const item = this.post;
    if (!item || this.isSavingVisibility || item.visibility === next) return;

    const previous = item.visibility;
    item.visibility = next;
    item.visible = next !== 'PRIVATE';
    this.isSavingVisibility = true;

    // the two services return different payload types; only completion matters here
    const request: Observable<unknown> = this.isNews
      ? this.newsService.update(item as News)
      : this.changelogsService.update(item as Changelogs);

    request.subscribe({
      next: () => {
        this.isSavingVisibility = false;
        this.toastService.success('Visibility set to ' + next.toLowerCase() + '.');
      },
      error: () => {
        // the interceptor reported the failure, the picker shows the saved state again
        item.visibility = previous;
        item.visible = previous !== 'PRIVATE';
        this.isSavingVisibility = false;
      }
    });
  }

  async delete() {
    const id = this.post?.id;
    if (id === undefined) return;

    const kind = this.isNews ? 'post' : 'changelog';
    const confirmed = await this.confirm.ask({
      title: `Delete this ${kind}?`,
      message: `“${this.post?.title}” will be removed from the website and the app. This cannot be undone.`,
      confirmLabel: `Delete ${kind}`,
      danger: true,
    });
    if (!confirmed) return;

    const request: Observable<unknown> = this.isNews
      ? this.newsService.deleteById(id)
      : this.changelogsService.deleteById(id);

    request.subscribe(() => {
      this.toastService.success(this.isNews ? 'Post deleted.' : 'Changelog deleted.');
      this.onCloseModal();
    });
  }
}
