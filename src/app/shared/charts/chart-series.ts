/** One line or bar stack of a chart. color is a CSS colour or variable, e.g. var(--accent). */
export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

/** A rounded maximum for the y axis, so lines do not touch the top: 87 -> 100, 1234 -> 1500; counts never below 4 */
export function niceMax(max: number) {
  if (max <= 4) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/** "Oct 3" for a yyyy-MM-dd day */
export function shortDay(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

/** 1234 -> "1,234", 25300 -> "25.3K" */
export function compact(value: number) {
  if (value < 10_000) return value.toLocaleString('en-US');
  if (value < 1_000_000) return (value / 1000).toFixed(value < 100_000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}
