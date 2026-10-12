import {DestroyRef, Directive, HostListener, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormGroup} from '@angular/forms';
import {debounceTime} from 'rxjs';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {HasUnsavedChanges} from '../../core/unsaved/unsaved-changes';
import {ToastService} from '../../services/toast-service';
import {LocalDraft} from './local-draft';

const KEEP_DELAY_MS = 1500;

/**
 * What every editor page (release, blog post) shares: work in progress is kept in this
 * browser while typing, offered again on the next visit, and leaving with unsaved changes asks first.
 *
 * Subclasses create their form, call keepDrafts() in the constructor and loaded() once the
 * entry is in the form.
 */
@Directive()
export abstract class EditorPage<V> implements HasUnsavedChanges {
  protected readonly confirm = inject(ConfirmService);
  protected readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  abstract readonly form: FormGroup;
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly draft = new LocalDraft<V>(() => this.draftKey());
  protected readonly draftAge = LocalDraft.age;

  /** storage key of the kept draft, e.g. "release-draft:my-app:new" */
  protected abstract draftKey(): string;

  protected keepDrafts() {
    this.form.valueChanges.pipe(debounceTime(KEEP_DELAY_MS), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.ready() && this.form.dirty) this.keepNow();
    });
    this.destroyRef.onDestroy(() => {
      if (this.ready() && this.form.dirty) this.keepNow();
    });
  }

  /** The entry is in the form: from here on changes count, and a kept draft is offered. */
  protected loaded() {
    this.form.markAsPristine();
    this.ready.set(true);
    this.draft.offer(this.form.getRawValue());
  }

  /** After saving or deleting: nothing is unsaved anymore. */
  protected settled() {
    this.draft.discard();
    this.form.markAsPristine();
  }

  /** Puts the kept draft back into the form; returns it so a page can restore extra state. */
  protected restoreDraft(): V | null {
    const kept = this.draft.restorable();
    if (!kept) return null;
    try {
      this.form.setValue(kept.value as never);
    } catch {
      // saved by an older version of this page with other fields
      this.toast.error('These changes can not be restored anymore.');
      this.draft.discard();
      return null;
    }
    this.form.markAsDirty();
    this.draft.restorable.set(null);
    this.toast.info('Your unsaved changes are back.');
    return kept.value;
  }

  /** e.g. "kept in this browser just now", for the bar under the title */
  protected draftStatus() {
    const savedAt = this.draft.savedAt();
    if (!savedAt) return this.form.dirty ? 'unsaved changes' : '';
    return `kept in this browser ${this.draftAge(savedAt)}`;
  }

  async canLeave(): Promise<boolean> {
    if (!this.form.dirty || this.saving()) return true;
    this.keepNow();
    return this.confirm.ask({
      title: 'Leave without saving?',
      message: 'Your changes are kept in this browser and offered again when you come back here.',
      confirmLabel: 'Leave',
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent) {
    if (this.form.dirty) {
      this.keepNow();
      event.preventDefault();
    }
  }

  private keepNow() {
    this.draft.save(this.form.getRawValue());
  }
}

/** Today as yyyy-MM-dd in local time, the format of date inputs and the backend. */
export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
