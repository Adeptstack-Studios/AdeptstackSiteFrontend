import {Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Changelogs} from '../models/changelogs';
import {News} from '../models/news';
import {DatePipe} from '@angular/common';
import {Warning} from '../warning/warning';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
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

  appName: string = '';

  constructor() {
    this.newsService = inject(NewsService);
    this.changelogsService = inject(ChangelogsService);
    this.appService = inject(AppService);
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

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditPost.emit(<number>this.post?.id);
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
