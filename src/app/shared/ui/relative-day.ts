import {Pipe, PipeTransform} from '@angular/core';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", "5 months ago" for a yyyy-MM-dd date. */
export function relativeDay(value: string | Date | null | undefined, today = new Date()): string {
  if (!value) return '–';
  const date = typeof value === 'string' ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : value;
  if (Number.isNaN(date.getTime())) return '–';

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfToday - startOfDay) / DAY_MS);

  if (days < 0) return days === -1 ? 'Tomorrow' : `in ${-days} days`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 730) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

@Pipe({name: 'relativeDay'})
export class RelativeDayPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return relativeDay(value);
  }
}
