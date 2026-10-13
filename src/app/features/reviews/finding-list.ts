import {Component, input} from '@angular/core';
import {ContentFinding} from '../../models/review';

/** What the content check found, each with the words around it and the match marked. */
@Component({
  selector: 'app-finding-list',
  template: `
    <ul class="findings">
      @for (finding of findings(); track $index) {
        <li>
          <span class="level" [attr.data-level]="finding.level">{{ finding.level === 'BLOCK' ? 'Blocked' : 'Hint' }}</span>
          <div class="text">
            <!-- on one line: whitespace between the parts would show up in the text -->
            <p class="excerpt">@for (part of parts(finding); track $index) {@if (part.mark) {<mark>{{ part.text }}</mark>} @else {{{ part.text }}}}</p>
            <p class="c-muted meta">in {{ finding.field }} · {{ finding.reason }}</p>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .findings {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    li {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .level {
      flex: none;
      min-width: 58px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--warn-soft);
      color: var(--warn);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
    }

    .level[data-level="BLOCK"] {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .text {
      min-width: 0;
    }

    .excerpt {
      margin: 0;
      overflow-wrap: anywhere;
    }

    mark {
      padding: 0 2px;
      border-radius: 3px;
      background: color-mix(in srgb, var(--warn) 30%, transparent);
      color: inherit;
    }

    .meta {
      margin: 2px 0 0;
      font-size: 12px;
    }
  `
})
export class FindingList {
  readonly findings = input.required<ContentFinding[]>();

  /** the excerpt split around the match, so it can be marked */
  protected parts(finding: ContentFinding): { text: string; mark: boolean }[] {
    const at = finding.excerpt.toLowerCase().indexOf(finding.match.toLowerCase());
    if (at < 0) return [{text: finding.excerpt, mark: false}];
    const end = at + finding.match.length;
    return [
      {text: finding.excerpt.substring(0, at), mark: false},
      {text: finding.excerpt.substring(at, end), mark: true},
      {text: finding.excerpt.substring(end), mark: false},
    ];
  }
}
