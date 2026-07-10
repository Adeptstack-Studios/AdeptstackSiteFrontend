import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {News} from '../models/news';
import {Changelogs} from '../models/changelogs';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {AppResponse} from '../models/app-response';
import {DatePipe} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {Warning} from '../warning/warning';

@Component({
  selector: 'app-app-modal',
  imports: [
    DatePipe,
    MarkdownComponent,
    Warning
  ],
  templateUrl: './app-modal.html',
  styleUrl: './app-modal.css',
})
export class AppModal {
  @Input() app?: AppResponse;
  @Output() closeModal = new EventEmitter<void>();
  @Output() onEditApp = new EventEmitter<number>();
  appService: AppService;

  constructor() {
    this.appService = inject(AppService);
  }

  isOpened = false;

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditApp.emit(<number>this.app?.id);
  }

  toggleVisibility() {
    if (this.app) {
      this.app.visible = !this.app.visible;
      this.appService.update(this.app as any).subscribe({
        next: () => {
        },
        error: (err) => {
          this.app!.visible = !this.app!.visible;
          console.error(err);
        }
      });
    }
  }

  delete() {
    this.isOpened = true;
  }

  isDelete(isDelete: boolean) {
    this.isOpened = false;

    if (isDelete) {
      this.appService.deleteById(<number>this.app?.id).subscribe({
        next: () => {
          this.onCloseModal();
        }, error: (error) => {
          console.log("error: " + error.message);
        }
      });
    }
  }
}
