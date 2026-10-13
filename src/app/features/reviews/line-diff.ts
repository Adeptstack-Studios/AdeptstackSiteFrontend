export interface DiffLine {
  kind: 'same' | 'add' | 'del' | 'skip';
  text: string;
}

/** Unchanged lines kept around each change; longer unchanged runs fold into one "skip" line. */
const CONTEXT = 2;

/**
 * Line by line comparison (longest common subsequence), good enough for release notes and posts.
 * Very long texts fall back to "all removed, all added" instead of a slow table.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > 400_000) {
    return [...a.map(text => ({kind: 'del' as const, text})), ...b.map(text => ({kind: 'add' as const, text}))];
  }

  // lengths[i][j] = longest common run of a[i..] and b[j..]
  const lengths = Array.from({length: a.length + 1}, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({kind: 'same', text: a[i]});
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      lines.push({kind: 'del', text: a[i++]});
    } else {
      lines.push({kind: 'add', text: b[j++]});
    }
  }
  while (i < a.length) lines.push({kind: 'del', text: a[i++]});
  while (j < b.length) lines.push({kind: 'add', text: b[j++]});
  return fold(lines);
}

function fold(lines: DiffLine[]): DiffLine[] {
  const near = lines.map((line, index) => line.kind !== 'same'
    || lines.slice(Math.max(0, index - CONTEXT), index + CONTEXT + 1).some(other => other.kind !== 'same'));
  const folded: DiffLine[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    if (near[index]) {
      if (skipped) folded.push({kind: 'skip', text: `${skipped} unchanged ${skipped === 1 ? 'line' : 'lines'}`});
      skipped = 0;
      folded.push(line);
    } else {
      skipped++;
    }
  });
  if (skipped) folded.push({kind: 'skip', text: `${skipped} unchanged ${skipped === 1 ? 'line' : 'lines'}`});
  return folded;
}
