import {
  ArrowUpRight, Bell, CalendarClock, ChartLine, ClipboardCheck, Clock, FileText, FolderOpen, History, House, Layers, LayoutDashboard,
  LayoutGrid, LogOut, Mail, Monitor, Moon, Plus, Rocket, Settings, ShieldCheck, Store, Sun, UserRound, Users, Webhook
} from 'lucide-angular';
import {SearchHit} from '../../models/search';
import {STATUS_LABELS} from '../../models/review';

/** Icons by name, so a remembered command can be stored as plain JSON. */
export const ICONS = {
  ArrowUpRight, Bell, CalendarClock, ChartLine, ClipboardCheck, Clock, FileText, FolderOpen, History, House, Layers, LayoutDashboard,
  LayoutGrid, LogOut, Mail, Monitor, Moon, Plus, Rocket, Settings, ShieldCheck, Store, Sun, UserRound, Users, Webhook
};
export type IconName = keyof typeof ICONS;

/** in this order on the palette */
export const GROUPS = ['Recent', 'This app', 'Pages', 'Apps', 'Actions', 'Releases', 'Posts', 'Reviews'] as const;
export type Group = typeof GROUPS[number];

export interface Command {
  /** the same for the same target, so recent entries don't repeat */
  id: string;
  group: Group;
  label: string;
  detail?: string;
  icon: IconName;
  /** shown as the app's tile instead of the icon */
  app?: { name: string; iconUrl: string | null };
  /** more words it is found by, e.g. the slug */
  keywords?: string;
  /** a route of the console ("/apps/ctu/releases") or an address elsewhere ("https://…") */
  url?: string;
  /** for actions that go nowhere, like switching the theme */
  run?: () => void;
  /** a small chip after the label, e.g. Draft or In review */
  chip?: { label: string; tone: 'muted' | 'warn' | 'accent' };
  /** only offered once something is typed, so the empty palette stays short */
  searchOnly?: boolean;
}

/** lower case without accents, like the backend's search */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** between words; dots stay, so a version is one word */
const WORD_BREAK = /[^\p{L}\p{N}.]+/u;

/** the typed words, split like the text they are looked for in: "pc-info" is "pc" and "info" */
export function words(query: string): string[] {
  return [...new Set(normalize(query).split(WORD_BREAK).filter(Boolean))];
}

/**
 * 0 unless every typed word starts a word of the label, detail or keywords, like the backend's search.
 * More when the label is or starts with the query, and for each typed word that starts a label word.
 */
export function score(command: Command, typed: string[]): number {
  const label = normalize(command.label);
  const all = [label, normalize(command.detail ?? ''), normalize(command.keywords ?? '')].join(' ').split(WORD_BREAK);
  if (!typed.every(word => all.some(each => each.startsWith(word)))) return 0;
  const query = typed.join(' ');
  let points = 1;
  if (label === query) points += 100;
  else if (label.startsWith(query)) points += 60;
  const labelWords = label.split(WORD_BREAK);
  for (const word of typed) {
    if (labelWords.some(labelWord => labelWord.startsWith(word))) points += 10;
  }
  return points;
}

const DAY = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

function day(at: string | null): string | null {
  return at ? DAY.format(new Date(at)) : null;
}

const REVIEW_TARGETS: Record<string, string> = {
  RELEASE: 'Release', POST: 'Post', APP: 'Store listing', PUSH: 'Push', NEWSLETTER: 'Newsletter',
};

/** A search result of the backend as a palette entry. */
export function fromHit(hit: SearchHit): Command {
  const app = hit.appName ? {name: hit.appName, iconUrl: hit.appIconUrl} : undefined;
  const chip = hit.planned ? {label: 'Planned', tone: 'accent' as const}
    : hit.visibility === 'PRIVATE' ? {label: 'Draft', tone: 'muted' as const}
      : hit.visibility === 'UNLISTED' ? {label: 'Unlisted', tone: 'muted' as const} : undefined;
  switch (hit.kind) {
    case 'RELEASE':
      return {
        id: 'release:' + hit.id, group: 'Releases', label: hit.title, icon: 'Rocket', app, chip,
        detail: [hit.appName, hit.channel, day(hit.at)].filter(Boolean).join(' · '),
        url: hit.appSlug ? `/apps/${hit.appSlug}/releases/${hit.id}` : '/apps',
      };
    case 'POST':
      return {
        id: 'post:' + hit.id, group: 'Posts', label: hit.title, icon: 'FileText', chip,
        detail: [hit.category ?? 'Post', hit.appName, day(hit.at)].filter(Boolean).join(' · '),
        url: `/blog/${hit.id}`,
      };
    case 'REVIEW':
      return {
        id: 'review:' + hit.id, group: 'Reviews', label: hit.title, icon: 'ClipboardCheck', app,
        detail: [REVIEW_TARGETS[hit.target ?? ''] ?? 'Change', hit.author ? 'by ' + hit.author : null, day(hit.at)]
          .filter(Boolean).join(' · '),
        chip: hit.status ? {label: STATUS_LABELS[hit.status], tone: hit.status === 'PENDING' ? 'accent' : 'warn'} : undefined,
        url: `/reviews/${hit.id}`,
      };
  }
}

/** What is kept of a command for "Recent": everything but the action, which can't be stored. */
export type StoredCommand = Omit<Command, 'run' | 'group' | 'searchOnly'>;

const RECENT_KEY = 'palette-recent';
const MAX_RECENT = 5;

export function readRecent(): StoredCommand[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(entry => entry?.id && entry?.url && entry.icon in ICONS) : [];
  } catch {
    return [];
  }
}

export function remember(command: Command) {
  if (!command.url) return;
  const {run: _run, group: _group, searchOnly: _searchOnly, ...stored} = command;
  try {
    const recent = [stored, ...readRecent().filter(entry => entry.id !== command.id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // storage blocked: the palette simply starts without recent entries
  }
}
