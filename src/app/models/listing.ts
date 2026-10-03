import {HttpParams, HttpResponse} from '@angular/common/http';

/** Shared rules for the paginated, sortable listings (news and changelogs). */

export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

/** One page of a listing plus the number of matches across all pages. */
export interface Page<T> {
  items: T[];
  total: number;
}

/** A filter value with the number of entries carrying it, e.g. a blog category. */
export interface Facet {
  name: string;
  count: number;
}

/** `value` is what the backend expects as ?sort= */
export interface SortOption {
  value: string;
  label: string;
}

/** Leaves out empty values, so an unset filter is simply not sent. */
export function toHttpParams(values: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/** The backend sends the number of all matches in X-Total-Count. */
export function toPage<T>(response: HttpResponse<T[]>): Page<T> {
  const items = response.body ?? [];
  const total = Number(response.headers.get('X-Total-Count'));
  return { items, total: Number.isFinite(total) && response.headers.has('X-Total-Count') ? total : items.length };
}

export function pageCount(total: number, size: number) {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * The page numbers to show: always the first and last page, the current one with its
 * neighbours, and 'gap' where pages are skipped. 1 … 4 5 6 … 12
 */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  // a gap of exactly one page is pointless, show that page instead
  if (current - 3 === 1) pages.add(2);
  if (current + 3 === total) pages.add(total - 1);

  const sorted = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('gap');
    result.push(page);
  });
  return result;
}
