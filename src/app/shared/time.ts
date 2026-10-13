/** Moments (release and publish times) between the backend's ISO instants and datetime-local inputs. */

const pad = (value: number) => String(value).padStart(2, '0');

/** yyyy-MM-ddTHH:mm in local time, the value of a datetime-local input; '' for nothing. */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value.length === 10 ? value + 'T00:00:00' : value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nowLocalInput(): string {
  return toLocalInput(new Date());
}

/** The ISO instant of a datetime-local value, null when it is empty or broken. */
export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local.length === 10 ? local + 'T00:00:00' : local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The day of a datetime-local value, yyyy-MM-dd, as the backend's publishedAt. */
export function localInputDay(local: string): string {
  return (local || '').substring(0, 10);
}

/** True when the moment lies ahead of now. */
export function isAhead(local: string | null | undefined): boolean {
  const iso = localInputToIso(local ?? '');
  return !!iso && new Date(iso).getTime() > Date.now();
}

/** "Nov 1, 18:00", with the year when it is not this one; "Nov 1" for midnight when dayOnly allows it. */
export function formatMoment(value: string | Date | null | undefined, options: { hideMidnight?: boolean } = {}): string {
  if (!value) return '–';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '–';
  const day = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(date.getFullYear() !== new Date().getFullYear() ? {year: 'numeric'} : {}),
  });
  if (options.hideMidnight && date.getHours() === 0 && date.getMinutes() === 0) return day;
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
