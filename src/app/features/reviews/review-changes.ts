import {Component, computed, input} from '@angular/core';
import {ReviewDetail, ReviewKind} from '../../models/review';
import {DiffLine, lineDiff} from './line-diff';

type FieldType = 'text' | 'long' | 'date' | 'visibility' | 'list' | 'flag';

interface Field {
  key: string;
  label: string;
  type?: FieldType;
}

const LINKS: Field[] = [
  {key: 'appUrl', label: 'Download'}, {key: 'microsoftStoreUrl', label: 'Microsoft Store'},
  {key: 'playStoreUrl', label: 'Play Store'}, {key: 'appStoreUrl', label: 'App Store'}, {key: 'steamUrl', label: 'Steam'},
  {key: 'curseforgeUrl', label: 'CurseForge'}, {key: 'modrinthUrl', label: 'Modrinth'}, {key: 'saasUrl', label: 'Web app'},
];

/** The fields a reviewer compares, per kind, in the order the editors show them. */
const FIELDS: Partial<Record<ReviewKind, Field[]>> = {
  RELEASE: [
    {key: 'visibility', label: 'Visibility', type: 'visibility'}, {key: 'version', label: 'Version'},
    {key: 'channel', label: 'Channel'}, {key: 'title', label: 'Title'}, {key: 'publishedAt', label: 'Release date', type: 'date'},
    {key: 'description', label: 'Summary', type: 'long'}, {key: 'content', label: 'Release notes', type: 'long'},
    {key: 'imageUrl', label: 'Cover image'}, ...LINKS,
  ],
  POST: [
    {key: 'visibility', label: 'Visibility', type: 'visibility'}, {key: 'title', label: 'Title'},
    {key: 'slug', label: 'Address'}, {key: 'category', label: 'Category'}, {key: 'appId', label: 'Linked app'},
    {key: 'publishedAt', label: 'Date', type: 'date'}, {key: 'description', label: 'Summary', type: 'long'},
    {key: 'content', label: 'Text', type: 'long'}, {key: 'imageUrl', label: 'Cover image'},
  ],
  APP: [
    {key: 'visibility', label: 'Visibility', type: 'visibility'}, {key: 'name', label: 'Name'},
    {key: 'slogan', label: 'Slogan'}, {key: 'slug', label: 'Address'}, {key: 'category', label: 'Category'},
    {key: 'platforms', label: 'Platforms'}, {key: 'description', label: 'Description', type: 'long'},
    {key: 'iconUrl', label: 'Icon'}, {key: 'images', label: 'Screenshots', type: 'list'}, {key: 'videoUrl', label: 'Video'},
    {key: 'modrinthId', label: 'Modrinth ID'}, {key: 'curseforgeId', label: 'CurseForge ID'},
    {key: 'highlighted', label: 'Highlighted', type: 'flag'}, {key: 'legacy', label: 'Legacy', type: 'flag'},
    {key: 'publishedAt', label: 'Release date', type: 'date'},
  ],
};

interface Row {
  label: string;
  long: boolean;
  before: string;
  after: string;
  diff: DiffLine[] | null;
}

/**
 * What approving does: for a live entry the changed fields, long texts line by line; for an entry going
 * live the first time everything it shows; for a deletion, push or newsletter what happens.
 */
@Component({
  selector: 'app-review-changes',
  template: `
    @switch (mode()) {
      @case ('delete') {
        <p class="lead">Once approved, <strong>{{ detail().review.title }}</strong> is deleted from the website
          and the Adeptstack app. This cannot be undone.</p>
      }
      @case ('push') {
        <p class="lead">Once approved, a push goes out
          {{ pushToReleases() ? 'to everyone in the app who wants release updates' : 'to everyone who allowed notifications' }}:</p>
        <p class="quote">{{ detail().review.title.replace('Push: ', '') }}</p>
      }
      @case ('newsletter') {
        <p class="lead">Once approved, the post is sent to every confirmed newsletter subscriber.</p>
      }
      @default {
        @if (mode() === 'new') {
          <p class="lead">Goes live for the first time, as <strong>{{ visibilityAfter() }}</strong>. Everything it shows:</p>
        } @else if (!rows().length) {
          <p class="lead">Nothing differs from the live version.</p>
        }
        <dl class="rows">
          @for (row of rows(); track row.label) {
            <div class="row">
              <dt>{{ row.label }}</dt>
              <dd>
                @if (row.diff) {
                  <div class="diff" role="group" [attr.aria-label]="row.label + ' line by line'">
                    @for (line of row.diff; track $index) {
                      <div class="line" [attr.data-kind]="line.kind">
                        <span class="sign" aria-hidden="true">{{ line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' ' }}</span>
                        <span class="sr-only">{{ line.kind === 'add' ? 'added: ' : line.kind === 'del' ? 'removed: ' : '' }}</span>
                        {{ line.text || ' ' }}
                      </div>
                    }
                  </div>
                } @else if (mode() === 'new') {
                  <span [class.long]="row.long">{{ row.after }}</span>
                } @else {
                  <span class="before"><span class="sr-only">before: </span>{{ row.before || '–' }}</span>
                  <span class="arrow" aria-hidden="true">→</span>
                  <span class="after"><span class="sr-only">after: </span>{{ row.after || '–' }}</span>
                }
              </dd>
            </div>
          }
        </dl>
      }
    }
  `,
  styles: `
    .lead {
      margin: 0 0 12px;
    }

    .quote {
      margin: 0;
      padding: 10px 12px;
      border-left: 3px solid var(--accent);
      background: var(--panel-2);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    .rows {
      margin: 0;
      display: flex;
      flex-direction: column;
    }

    .row {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr);
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }

    .row:first-child {
      border-top: none;
    }

    dt {
      color: var(--muted);
      font-size: 13px;
    }

    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .long {
      white-space: pre-wrap;
    }

    .before {
      color: var(--muted);
      text-decoration: line-through;
    }

    .arrow {
      margin: 0 8px;
      color: var(--muted);
    }

    .after {
      font-weight: 550;
    }

    .diff {
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      overflow: hidden;
      font-family: var(--font-mono);
      font-size: 12.5px;
      line-height: 1.55;
    }

    .line {
      padding: 1px 10px 1px 6px;
      white-space: pre-wrap;
    }

    .sign {
      display: inline-block;
      width: 14px;
      color: var(--muted);
    }

    .line[data-kind="add"] {
      background: var(--good-soft);
    }

    .line[data-kind="del"] {
      background: var(--danger-soft);
    }

    .line[data-kind="skip"] {
      background: var(--panel-2);
      color: var(--muted);
      font-family: var(--font-body);
      font-style: italic;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .row {
        grid-template-columns: minmax(0, 1fr);
        gap: 4px;
      }
    }
  `
})
export class ReviewChanges {
  readonly detail = input.required<ReviewDetail>();

  protected readonly mode = computed(() => {
    const {review, baseline} = this.detail();
    if (review.action === 'DELETE') return 'delete';
    if (review.kind === 'PUSH') return 'push';
    if (review.kind === 'NEWSLETTER') return 'newsletter';
    return text(baseline?.['visibility'], 'visibility') === 'Private' ? 'new' : 'change';
  });

  protected readonly pushToReleases = computed(() => this.detail().payload?.['kind'] === 'RELEASE');
  protected readonly visibilityAfter = computed(() => text(this.detail().payload?.['visibility'], 'visibility').toLowerCase());

  protected readonly rows = computed<Row[]>(() => {
    const {review, payload, baseline} = this.detail();
    const fields = FIELDS[review.kind] ?? [];
    const isNew = this.mode() === 'new';
    return fields.flatMap(field => {
      const before = text(baseline?.[field.key], field.type);
      const after = text(payload?.[field.key] ?? (isNew ? undefined : baseline?.[field.key]), field.type);
      const long = field.type === 'long' || field.type === 'list';
      if (isNew) return after ? [{label: field.label, long, before: '', after, diff: null}] : [];
      if (before === after) return [];
      return [{label: field.label, long, before, after, diff: long ? lineDiff(before, after) : null}];
    });
  });
}

/** A field value as the reviewer reads it. */
function text(value: unknown, type?: FieldType): string {
  if (value === null || value === undefined) return '';
  switch (type) {
    case 'visibility': {
      const name = String(value).toLowerCase();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    case 'date':
      return String(value).substring(0, 10);
    case 'flag':
      return value ? 'yes' : 'no';
    case 'list':
      return Array.isArray(value)
        ? value.map(item => {
          const image = item as { url?: string; text?: string | null };
          return image.text ? `${image.url} · ${image.text}` : String(image.url ?? '');
        }).join('\n')
        : '';
    default:
      return String(value).trim();
  }
}
