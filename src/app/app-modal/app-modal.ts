import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {News} from '../models/news';
import {Changelogs} from '../models/changelogs';
import {NewsService} from '../services/news-service';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
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
  toastService: ToastService;

  constructor() {
    this.appService = inject(AppService);
    this.toastService = inject(ToastService);
  }

  isOpened = false;

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditApp.emit(<number>this.app?.id);
  }


  /** Public / Unlisted / Private, set directly in the popup. */
  readonly visibilityOptions: { value: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'; label: string; hint: string }[] = [
    { value: 'PUBLIC', label: 'Public', hint: 'Listed everywhere' },
    { value: 'UNLISTED', label: 'Unlisted', hint: 'Only via direct link and in the app' },
    { value: 'PRIVATE', label: 'Private', hint: 'Admins only' }
  ];
  isSavingVisibility = false;

  get currentVisibility(): 'PUBLIC' | 'UNLISTED' | 'PRIVATE' {
    return this.app?.visibility || 'PRIVATE';
  }

  setVisibility(next: 'PUBLIC' | 'UNLISTED' | 'PRIVATE') {
    const item = this.app;
    if (!item || this.isSavingVisibility || item.visibility === next) return;

    const previous = item.visibility;
    item.visibility = next;
    item.visible = next !== 'PRIVATE';
    this.isSavingVisibility = true;

    this.appService.update(item as any).subscribe({
      next: () => {
        this.isSavingVisibility = false;
        this.toastService.success('Visibility set to ' + next.toLowerCase() + '.');
      },
      error: (err) => {
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
