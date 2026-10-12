/**
 * Version numbers the way the backend reads them (VersionComparator.java):
 * 1.10.0 is newer than 1.9.0, and 2.0.0-beta.1 comes right before 2.0.0.
 */

interface ParsedVersion {
  core: number[];
  /** "" for a release, "beta.2" for a pre-release */
  pre: string;
}

/** Same rule as the backend: starts like a version number (1.2, v3), not like "beta". */
export function isVersionNumber(version: string | null | undefined): boolean {
  return /^\d/.test(normalize(version ?? ''));
}

/** Ascending order, like Array.sort expects. Blank versions sort last. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const aBlank = !a?.trim();
  const bBlank = !b?.trim();
  if (aBlank || bBlank) return Number(aBlank) - Number(bBlank);

  const [aCore, aPre] = splitPreRelease(normalize(a!));
  const [bCore, bPre] = splitPreRelease(normalize(b!));

  const core = compareSegments(aCore, bCore, true);
  if (core !== 0) return core;

  // same core version: the release is newer than any of its pre-releases
  if (!!aPre !== !!bPre) return aPre ? -1 : 1;
  return compareSegments(aPre, bPre, false);
}

/** The channel family, so stable/main and beta/develop are treated alike. */
export type ChannelKind = 'stable' | 'beta' | 'other';

const STABLE_CHANNELS = ['stable', 'main', 'master', 'release', 'latest', 'production', 'prod'];
const BETA_CHANNELS = ['beta', 'develop', 'dev', 'preview', 'nightly', 'alpha', 'canary', 'next', 'rc', 'testing'];

export function channelKind(channel: string | null | undefined): ChannelKind {
  const name = (channel ?? '').trim().toLowerCase();
  if (STABLE_CHANNELS.includes(name)) return 'stable';
  if (BETA_CHANNELS.includes(name)) return 'beta';
  return 'other';
}

export interface VersionSuggestion {
  version: string;
  /** e.g. "patch", "minor · promotes beta", "next beta" */
  label: string;
  kind: 'stable' | 'beta';
}

/**
 * What could come next, from the newest stable and beta version of an app:
 * patch, minor and major after the stable one, and the next beta. When a beta is ahead
 * of stable, its plain version is offered as the stable release that "promotes" it.
 */
export function suggestVersions(latestStable?: string | null, latestBeta?: string | null): VersionSuggestion[] {
  const stable = parse(latestStable);
  const beta = parse(latestBeta);
  const betaAhead = beta && beta.pre && (!stable || compareCore(beta.core, stable.core) > 0) ? beta : null;

  if (!stable && !beta) {
    return [
      {version: '1.0.0', label: 'first release', kind: 'stable'},
      {version: '0.1.0', label: 'early version', kind: 'stable'},
      {version: '1.0.0-beta.1', label: 'first beta', kind: 'beta'},
    ];
  }

  const suggestions: VersionSuggestion[] = [];
  if (stable) {
    const [major, minor, patch] = stable.core;
    suggestions.push(
      {version: format([major, minor, patch + 1]), label: 'patch', kind: 'stable'},
      {version: format([major, minor + 1, 0]), label: 'minor', kind: 'stable'},
      {version: format([major + 1, 0, 0]), label: 'major', kind: 'stable'},
    );
  }

  if (betaAhead) {
    const promoted = format(betaAhead.core);
    const same = suggestions.find(suggestion => suggestion.version === promoted);
    if (same) {
      same.label += ' · promotes beta';
    } else {
      suggestions.unshift({version: promoted, label: 'promotes beta', kind: 'stable'});
    }
    suggestions.push({version: `${promoted}-${bumpPreRelease(betaAhead.pre)}`, label: 'next beta', kind: 'beta'});
  } else if (stable) {
    const [major, minor] = stable.core;
    suggestions.push({version: `${format([major, minor + 1, 0])}-beta.1`, label: 'next beta', kind: 'beta'});
  }
  return suggestions;
}

/** The highest version among the given ones, ignoring anything that is no version number. */
export function highestVersion(versions: (string | null | undefined)[]): string | null {
  return versions.filter(isVersionNumber).sort(compareVersions).at(-1) ?? null;
}

// help functions

function normalize(version: string) {
  let trimmed = version.trim();
  if (/^v/i.test(trimmed)) trimmed = trimmed.substring(1);
  // build metadata (+abc) never decides the order
  const plus = trimmed.indexOf('+');
  return plus >= 0 ? trimmed.substring(0, plus) : trimmed;
}

function splitPreRelease(version: string): [string, string] {
  const dash = version.indexOf('-');
  return dash < 0 ? [version, ''] : [version.substring(0, dash), version.substring(dash + 1)];
}

/**
 * @param padWithZero core versions treat a missing part as 0 (1.2 == 1.2.0),
 *                    pre-releases treat the shorter one as older (beta < beta.1)
 */
function compareSegments(a: string, b: string, padWithZero: boolean): number {
  const aSegments = a ? a.split('.') : [];
  const bSegments = b ? b.split('.') : [];
  const length = Math.max(aSegments.length, bSegments.length);

  for (let i = 0; i < length; i++) {
    const aMissing = i >= aSegments.length;
    const bMissing = i >= bSegments.length;
    if (!padWithZero && (aMissing || bMissing)) return aMissing ? -1 : 1;

    const result = compareSegment(aMissing ? '0' : aSegments[i], bMissing ? '0' : bSegments[i]);
    if (result !== 0) return result;
  }
  return 0;
}

function compareSegment(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) {
    const aDigits = a.replace(/^0+(?=\d)/, '');
    const bDigits = b.replace(/^0+(?=\d)/, '');
    if (aDigits.length !== bDigits.length) return aDigits.length - bDigits.length;
    return aDigits < bDigits ? -1 : aDigits > bDigits ? 1 : 0;
  }
  // numbers before words, as in semver: 1.0.0-1 < 1.0.0-alpha
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

/** major.minor.patch as numbers, null when the core is not purely numeric. */
function parse(version: string | null | undefined): ParsedVersion | null {
  if (!version || !isVersionNumber(version)) return null;
  const [core, pre] = splitPreRelease(normalize(version));
  const parts = core.split('.');
  if (!parts.every(part => /^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  while (numbers.length < 3) numbers.push(0);
  return {core: numbers.slice(0, 3), pre};
}

function compareCore(a: number[], b: number[]) {
  return compareSegments(a.join('.'), b.join('.'), true);
}

function format(core: number[]) {
  return core.join('.');
}

/** beta.2 -> beta.3, beta -> beta.1, rc1 -> rc2 */
function bumpPreRelease(pre: string) {
  const match = pre.match(/^(.*?)(\d+)$/);
  if (!match) return `${pre}.1`;
  return match[1] + (Number(match[2]) + 1);
}
