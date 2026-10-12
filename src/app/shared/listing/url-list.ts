import {computed, DestroyRef, Signal, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {PAGE_SIZES} from '../../models/listing';

/** The visibility filter of list pages; '' shows everything. */
export const VISIBILITY_FILTERS = [
  {value: '', label: 'All'}, {value: 'PUBLIC', label: 'Public'},
  {value: 'UNLISTED', label: 'Unlisted'}, {value: 'PRIVATE', label: 'Private'},
];

/** Filters, sort and paging of a list; every value has a default that stays out of the URL. */
export type ListState = Record<string, string | number> & { page: number; size: number };

/**
 * Keeps the state of a list in the URL, so a filtered list can be bookmarked and the back
 * button works. Values equal to their default are left out of the address.
 */
export class UrlListState<S extends ListState> {
  readonly state: WritableSignal<S>;
  /** true while any filter other than sort and paging is set */
  readonly filtered: Signal<boolean>;

  constructor(private readonly route: ActivatedRoute, private readonly router: Router,
              private readonly defaults: S, destroyRef: DestroyRef) {
    this.state = signal(defaults);
    this.filtered = computed(() => Object.entries(this.state()).some(([key, value]) =>
      !['page', 'size', 'sort'].includes(key) && value !== defaults[key]));

    const subscription = route.queryParamMap.subscribe(params => {
      const next = {...defaults} as Record<string, string | number>;
      for (const [key, fallback] of Object.entries(defaults)) {
        const raw = params.get(key);
        if (raw === null) continue;
        if (typeof fallback === 'number') {
          const number = Number(raw);
          const valid = key === 'size' ? (PAGE_SIZES as readonly number[]).includes(number) : Number.isInteger(number) && number > 0;
          if (valid) next[key] = number;
        } else {
          next[key] = raw;
        }
      }
      this.state.set(next as S);
    });
    destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  update(change: Partial<S>) {
    const next = {...this.state(), ...change};
    const queryParams: Params = {};
    for (const [key, value] of Object.entries(next)) {
      queryParams[key] = value === this.defaults[key] || value === '' ? null : value;
    }
    this.router.navigate([], {relativeTo: this.route, queryParams});
  }

  /** Back to every entry, keeping sort and page size. */
  clearFilters() {
    const cleared: Record<string, string | number> = {page: 1};
    for (const key of Object.keys(this.defaults)) {
      if (!['page', 'size', 'sort'].includes(key)) cleared[key] = this.defaults[key];
    }
    this.update(cleared as Partial<S>);
  }

  /** After loading: a filter or a deletion emptied the page, so go to the last one that exists. */
  fixPage(total: number): boolean {
    const {page, size} = this.state();
    const lastPage = Math.max(1, Math.ceil(total / size));
    if (page <= lastPage) return false;
    this.update({page: lastPage} as Partial<S>);
    return true;
  }
}
