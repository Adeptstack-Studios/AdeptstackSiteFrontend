import {Component, input} from '@angular/core';
import {Check, CircleAlert, CircleX, LucideAngularModule} from 'lucide-angular';

/** One point of "Before you publish". */
export interface EditorCheck {
  ok: boolean;
  /** an error blocks saving, a warning only points something out */
  severity: 'error' | 'warning';
  text: string;
}

/** True when a check that blocks saving fails. */
export function hasBlockingCheck(checks: EditorCheck[]) {
  return checks.some(check => !check.ok && check.severity === 'error');
}

/** "Before you publish": what is fine, what is only a hint and what must be fixed first. */
@Component({
  selector: 'app-checks-card',
  imports: [LucideAngularModule],
  template: `
    <section class="c-card" aria-labelledby="checks-heading">
      <div class="c-card-head"><h2 id="checks-heading">{{ heading() }}</h2></div>
      <ul class="checks">
        @for (check of checks(); track check.text) {
          <li [class]="check.ok ? 'ok' : check.severity">
            <lucide-icon [img]="check.ok ? icons.Check : check.severity === 'error' ? icons.CircleX : icons.CircleAlert"
                         [size]="16" aria-hidden="true"></lucide-icon>
            <span>{{ check.text }}<span class="sr-only">{{ check.ok ? ' (ok)' : check.severity === 'error' ? ' (must be fixed)' : ' (hint)' }}</span></span>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .checks {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .checks li {
      display: flex;
      gap: 9px;
      font-size: 13.5px;
    }

    .checks lucide-icon {
      flex: none;
      margin-top: 2px;
    }

    .ok lucide-icon {
      color: var(--good);
    }

    .warning lucide-icon {
      color: var(--warn);
    }

    .error {
      color: var(--danger);
      font-weight: 600;
    }
  `
})
export class ChecksCard {
  readonly checks = input.required<EditorCheck[]>();
  readonly heading = input('Before you publish');

  protected readonly icons = {Check, CircleAlert, CircleX};
}
