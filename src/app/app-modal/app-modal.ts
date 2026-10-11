import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
import {AppResponse} from '../models/app-response';
import {DatePipe} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ConfirmService} from '../core/confirm/confirm-service';
import {Visibility, VisibilityPicker} from '../shared/visibility-picker/visibility-picker';

@Component({
  selector: 'app-app-modal',
  imports: [
    DatePipe,
    MarkdownComponent,
    VisibilityPicker
  ],
  templateUrl: './app-modal.html',
  styleUrl: '../shared/styles/detail-popup.css',
})
export class AppModal {
  @Input() app?: AppResponse;
  @Output() closeModal = new EventEmitter<void>();
  @Output() onEditApp = new EventEmitter<number>();

  private readonly appService = inject(AppService);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  onCloseModal() {
    this.closeModal.emit();
  }

  edit() {
    this.onEditApp.emit(<number>this.app?.id);
  }

  isSavingVisibility = false;

  get currentVisibility(): Visibility {
    return this.app?.visibility || 'PRIVATE';
  }

  setVisibility(next: Visibility) {
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
      error: () => {
        // the interceptor reported the failure, the picker shows the saved state again
        item.visibility = previous;
        item.visible = previous !== 'PRIVATE';
        this.isSavingVisibility = false;
      }
    });
  }

  async delete() {
    const id = this.app?.id;
    if (id === undefined) return;

    const confirmed = await this.confirm.ask({
      title: 'Delete this app?',
      message: `“${this.app?.name}” and its product page will be removed. This cannot be undone.`,
      confirmLabel: 'Delete app',
      danger: true,
    });
    if (!confirmed) return;

    this.appService.deleteById(id).subscribe(() => {
      this.toastService.success('App deleted.');
      this.onCloseModal();
    });
  }
}
