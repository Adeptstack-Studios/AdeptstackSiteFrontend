import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {Changelogs} from '../models/changelogs';
import {News} from '../models/news';
import {DatePipe} from '@angular/common';
import {Warning} from '../warning/warning';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';

@Component({
  selector: 'app-post-modal',
  imports: [
    DatePipe,
    Warning
  ],
  templateUrl: './post-modal.html',
  styleUrl: './post-modal.css',
})
export class PostModal {

  @Input() post?: News | Changelogs;
  @Input() isNews: boolean = true;
  @Output() closeModal = new EventEmitter<void>();
  newsService: NewsService;
  changelogsService: ChangelogsService;
  id: number = -1;

  constructor() {
    this.newsService = inject(NewsService);
    this.changelogsService = inject(ChangelogsService);
  }

  isOpened = false;

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {

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
