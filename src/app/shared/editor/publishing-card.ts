import {Component, input} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Visibility} from '../visibility-picker/visibility-picker';

const PUBLISH_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  {value: 'PRIVATE', label: 'Private draft', hint: 'Only visible here'},
  {value: 'UNLISTED', label: 'Unlisted', hint: 'Reachable by link and in the app, not listed'},
  {value: 'PUBLIC', label: 'Public', hint: 'Listed on adeptstack.net and in the app'},
];

/** Visibility, push and date of a release or post. The page owns the controls and saves. */
@Component({
  selector: 'app-publishing-card',
  imports: [ReactiveFormsModule],
  template: `
    <section class="c-card" aria-labelledby="publish-heading">
      <div class="c-card-head"><h2 id="publish-heading">Publishing</h2></div>
      <div class="options" role="radiogroup" aria-labelledby="publish-heading">
        @for (option of options; track option.value) {
          <label class="option" [class.checked]="visibility().value === option.value">
            <input type="radio" [formControl]="visibility()" [value]="option.value">
            <span class="c-status" [class]="option.value.toLowerCase()">{{ option.label }}</span>
            <span class="hint">{{ option.hint }}</span>
          </label>
        }
      </div>

      @if (visibility().value !== 'PRIVATE') {
        <label class="check">
          <input type="checkbox" [formControl]="push()">
          <span>
            <strong>Send a push once it is live</strong>
            <span class="hint">{{ pushPreview() }}</span>
          </span>
        </label>
      }

      <div class="date">
        <label class="c-label" for="publishedAt">{{ dateLabel() }}</label>
        <input id="publishedAt" class="c-input" type="date" [formControl]="publishedAt()">
      </div>
    </section>
  `,
  styles: `
    .options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .option {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .option input {
      position: absolute;
      opacity: 0;
    }

    .option.checked {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .option:focus-within {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .option .c-status {
      font-weight: 600;
    }

    .hint {
      display: block;
      color: var(--muted);
      font-size: 12.5px;
    }

    .check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 14px;
      cursor: pointer;
    }

    .check input {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--accent);
    }

    .date {
      margin-top: 14px;
    }
  `
})
export class PublishingCard {
  readonly visibility = input.required<FormControl<Visibility>>();
  readonly push = input.required<FormControl<boolean>>();
  readonly publishedAt = input.required<FormControl<string>>();
  /** e.g. the push title in quotes */
  readonly pushPreview = input('');
  /** already public or unlisted: saving changes what people see right away */
  readonly live = input(false);
  readonly dateLabel = input('Release date');

  protected readonly options = PUBLISH_OPTIONS;
}
