import {signal} from '@angular/core';
import {relativeDay} from '../ui/relative-day';

/** What is kept in the browser: the raw form value and when it was saved. */
export interface StoredDraft<T> {
  savedAt: number;
  value: T;
}

/**
 * Keeps unsaved work of an editor in this browser, so a closed tab or an expired session
 * loses nothing. Storage may be blocked or full; then nothing is kept and nothing breaks.
 */
export class LocalDraft<T> {
  /** when the current work was last kept here, null when nothing is */
  readonly savedAt = signal<number | null>(null);
  /** a draft from an earlier visit, waiting to be restored or discarded */
  readonly restorable = signal<StoredDraft<T> | null>(null);

  /** @param key the storage key; a function because ids appear after the first save */
  constructor(private readonly key: () => string) {
  }

  save(value: T) {
    const draft: StoredDraft<T> = {savedAt: Date.now(), value};
    try {
      localStorage.setItem(this.key(), JSON.stringify(draft));
      this.savedAt.set(draft.savedAt);
    } catch {
      // full or blocked storage: the leave warning still protects the work
    }
  }

  /** Offers a kept draft unless it equals what was just loaded. */
  offer(current: T) {
    try {
      const raw = localStorage.getItem(this.key());
      if (!raw) return;
      const draft = JSON.parse(raw) as StoredDraft<T>;
      if (JSON.stringify(draft.value) === JSON.stringify(current)) {
        localStorage.removeItem(this.key());
      } else {
        this.restorable.set(draft);
      }
    } catch {
      // unreadable leftovers are simply ignored
    }
  }

  discard() {
    this.restorable.set(null);
    this.savedAt.set(null);
    try {
      localStorage.removeItem(this.key());
    } catch {
      // storage may be blocked; there is nothing to clean up then
    }
  }

  /** "just now", "12 min ago", "yesterday" */
  static age(savedAt: number) {
    const minutes = Math.round((Date.now() - savedAt) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    return relativeDay(new Date(savedAt)).toLowerCase();
  }
}
