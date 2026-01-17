import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {Changelogs} from '../models/changelogs';
import {News} from '../models/news';
import {DatePipe} from '@angular/common';
import {Warning} from '../warning/warning';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
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
export class PostModal {

  @Input() post?: News | Changelogs;
  @Input() isNews: boolean = true;
  @Output() closeModal = new EventEmitter<void>();
  @Output() onEditPost = new EventEmitter<number>();
  newsService: NewsService;
  changelogsService: ChangelogsService;

  constructor() {
    this.newsService = inject(NewsService);
    this.changelogsService = inject(ChangelogsService);
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
