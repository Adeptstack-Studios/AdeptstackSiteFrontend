import {Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Observable} from 'rxjs';
import {Changelogs} from '../models/changelogs';
import {News} from '../models/news';
import {DatePipe} from '@angular/common';
import {Warning} from '../warning/warning';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
import {MarkdownComponent} from 'ngx-markdown';

@Component({
  selector: 'app-post-modal',
  imports: [
    DatePipe,
    Warning,
    MarkdownComponent
  ],
  templateUrl: './post-modal.html',
  styleUrl: './post-modal.css',
})
export class PostModal implements OnInit, OnChanges {

  @Input() post?: News | Changelogs;
  @Input() isNews: boolean = true;
  @Output() closeModal = new EventEmitter<void>();
  @Output() onEditPost = new EventEmitter<number>();
  newsService: NewsService;
  changelogsService: ChangelogsService;
  appService: AppService;
  toastService: ToastService;

  appName: string = '';

  constructor() {
    this.newsService = inject(NewsService);
    this.changelogsService = inject(ChangelogsService);
    this.appService = inject(AppService);
    this.toastService = inject(ToastService);
  }

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
      this.appService.getById(this.post.appId).subscribe({
        next: (response) => {
          if (response.body) {
            this.appName = response.body.name || '';
          }
        },
        error: () => {
          this.appName = '';
        }
      });
    } else {
      this.appName = '';
    }
  }

  isOpened = false;
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
      error: (err) => {
        this.toastService.error(err.error?.message || err.error || 'Sending the push failed.');
        this.isSendingPush = false;
      }
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
      error: (err) => {
        this.toastService.error(err.error?.message || err.error || 'Sending the newsletter failed.');
        this.isSendingNewsletter = false;
      }
    });
  }

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditPost.emit(<number>this.post?.id);
  }


  /** Public / Unlisted / Private, set directly in the popup. */
  readonly visibilityOptions: { value: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'; label: string; hint: string }[] = [
    { value: 'PUBLIC', label: 'Public', hint: 'Listed everywhere' },
    { value: 'UNLISTED', label: 'Unlisted', hint: 'Only via direct link and in the app' },
    { value: 'PRIVATE', label: 'Private', hint: 'Admins only' }
  ];
  isSavingVisibility = false;

  get currentVisibility(): 'PUBLIC' | 'UNLISTED' | 'PRIVATE' {
    return this.post?.visibility || 'PRIVATE';
  }

  setVisibility(next: 'PUBLIC' | 'UNLISTED' | 'PRIVATE') {
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
      error: (err: unknown) => {
        item.visibility = previous;
        item.visible = previous !== 'PRIVATE';
        this.isSavingVisibility = false;
        this.toastService.error('Could not change the visibility.');
        console.error(err);
      }
    });
  }

  delete() {
    this.isOpened = true;
  }

  isDelete(isDelete: boolean) {
    this.isOpened = false;

    if (isDelete) {
      if (this.isNews) {
        this.newsService.deleteById(<number>this.post?.id).subscribe({
          next: () => {
            this.onCloseModal();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
      else {
        this.changelogsService.deleteById(<number>this.post?.id).subscribe({
          next: () => {
            this.onCloseModal();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
    }
  }
}
