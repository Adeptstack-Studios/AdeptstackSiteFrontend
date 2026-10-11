import {DestroyRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {debounceTime, distinctUntilChanged, Observable, Subject} from 'rxjs';
import {DEFAULT_PAGE_SIZE, Page, pageCount} from '../../models/listing';

/** Loads one page with the page's own filters; `search` is the debounced search term. */
export type PageLoader<T> = (page: number, size: number, search: string) => Observable<Page<T>>;

/**
 * Paging, search and reloading for a backend-filtered listing, shared by every list page.
 * Filters stay on the page itself: they are read by the loader on every reload.
 */
export class ListController<T> {
  items: T[] = [];
  total = 0;
  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  searchTerm = '';
  loading = false;

  private readonly searchInput = new Subject<string>();

  constructor(private readonly load: PageLoader<T>, destroyRef: DestroyRef) {
    // one request per pause in typing, not per keystroke
    this.searchInput.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(destroyRef)).subscribe(term => {
      this.searchTerm = term;
      this.filtersChanged();
    });
  }

  reload() {
    this.loading = true;
    this.load(this.page, this.pageSize, this.searchTerm).subscribe({
      next: result => {
        // e.g. the last entry of the last page was deleted: step back to the page that still exists
        if (result.items.length === 0 && result.total > 0 && this.page > 1) {
          this.page = pageCount(result.total, this.pageSize);
          this.reload();
          return;
        }
        this.items = result.items;
        this.total = result.total;
        this.loading = false;
      },
      // the error interceptor already told the user
      error: () => this.loading = false
    });
  }

  search(term: string) {
    this.searchInput.next(term.trim());
  }

  /** Any filter or the sort order changed: the old page number means nothing anymore. */
  filtersChanged() {
    this.page = 1;
    this.reload();
  }

  goToPage(page: number) {
    this.page = page;
    this.reload();
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.reload();
  }
}
