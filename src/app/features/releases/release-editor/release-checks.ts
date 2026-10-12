import {compareVersions, isVersionNumber} from '../../../shared/versions';
import {LINK_FIELDS} from '../../../models/console';
import {EditorCheck} from '../../../shared/editor/checks-card';

/** What "Before you publish" looks at; plain values so it can be computed from the form. */
export interface ReleaseDraft {
  version: string;
  channel: string;
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  links: Record<string, string>;
}

// built from lines so the "* " bullets keep their space for typing
export const NOTES_TEMPLATE = ['## New Features', '', '* ', '', '## Changes', '', '* ', '', '## Fixes', '', '* ', ''].join('\n');

/**
 * @param channelVersions every other version already in the chosen channel
 * @param hasAppIcon       the app icon stands in for a missing cover image
 */
export function checkRelease(draft: ReleaseDraft, channelVersions: string[], hasAppIcon: boolean): EditorCheck[] {
  const version = draft.version.trim();
  const checks: EditorCheck[] = [];

  if (!version) {
    checks.push({ok: false, severity: 'error', text: 'Version is missing'});
  } else if (channelVersions.some(other => compareVersions(other, version) === 0)) {
    checks.push({ok: false, severity: 'error', text: `${version} already exists in ${draft.channel || 'this channel'}`});
  } else if (!isVersionNumber(version)) {
    checks.push({ok: false, severity: 'warning', text: `“${version}” does not look like a version number`});
  } else {
    const newest = channelVersions.filter(isVersionNumber).sort(compareVersions).at(-1);
    checks.push(newest && compareVersions(version, newest) < 0
      ? {ok: false, severity: 'warning', text: `Version is lower than the latest ${draft.channel} release ${newest}`}
      : {ok: true, severity: 'warning', text: newest ? `Version is higher than ${newest}` : `First release in ${draft.channel || 'this channel'}`});
  }

  if (!draft.channel.trim()) checks.push({ok: false, severity: 'error', text: 'Channel is missing'});
  if (!draft.title.trim()) checks.push({ok: false, severity: 'error', text: 'Title is missing'});
  if (!draft.description.trim()) checks.push({ok: false, severity: 'error', text: 'Summary is missing'});

  if (!draft.content.trim()) {
    checks.push({ok: false, severity: 'error', text: 'Release notes are empty'});
  } else {
    const sections = ['New Features', 'Changes', 'Fixes'].filter(section =>
      new RegExp(`^##\\s+${section}\\s*$`, 'mi').test(draft.content));
    const leftovers = /^\*\s*$/m.test(draft.content);
    checks.push(leftovers
      ? {ok: false, severity: 'warning', text: 'Release notes still have empty bullet points'}
      : {ok: sections.length > 0, severity: 'warning', text: sections.length
          ? `Release notes follow ${sections.join(' / ')}`
          : 'Release notes have no New Features / Changes / Fixes sections'});
  }

  const linkCount = LINK_FIELDS.filter(({field}) => draft.links[field]?.trim()).length;
  checks.push(linkCount
    ? {ok: true, severity: 'error', text: linkCount === 1 ? 'One download link' : `${linkCount} download links`}
    : {ok: false, severity: 'error', text: 'At least one download or store link is needed'});

  if (draft.imageUrl.trim()) {
    checks.push({ok: true, severity: 'warning', text: 'Cover image set'});
  } else {
    checks.push(hasAppIcon
      ? {ok: false, severity: 'warning', text: 'No cover image: the app icon is used for link previews'}
      : {ok: false, severity: 'error', text: 'Upload a cover image, the app has no icon to fall back to'});
  }

  return checks;
}
