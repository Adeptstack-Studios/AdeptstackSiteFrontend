import {Component, computed, input} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Visibility} from '../visibility-picker/visibility-picker';
import {isAhead} from '../time';

const PUBLISH_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  {value: 'PRIVATE', label: 'Private draft', hint: 'Only visible here'},
  {value: 'UNLISTED', label: 'Unlisted', hint: 'Reachable by link and in the app, not listed'},
  {value: 'PUBLIC', label: 'Public', hint: 'Listed on adeptstack.net and in the app'},
];

export type PublishWhen = 'now' | 'plan';
export type ComingSoon = 'off' | 'now' | 'at';

/**
 * Visibility, time, plan and pushes of a release or post. The page owns the controls and saves.
 * A plan keeps the entry private and lets the console show it later on its own: posts at the
 * publish time, releases also as coming soon before that.
 */
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

      @if (shown()) {
        <div class="block">
          <span class="c-label" id="when-label">When</span>
          <div class="c-seg" role="group" aria-labelledby="when-label">
            <button type="button" [attr.aria-pressed]="!planned()" (click)="setWhen('now')">Now</button>
            <button type="button" [attr.aria-pressed]="planned()" (click)="setWhen('plan')">Plan</button>
          </div>
        </div>
      }

      <div class="block">
        <label class="c-label" for="moment">{{ momentLabel() }}</label>
        <input id="moment" class="c-input" type="datetime-local" [formControl]="moment()">
        @if (momentHint()) { <p class="c-hint">{{ momentHint() }}</p> }
      </div>

      @if (isRelease() && planned() && comingSoon()) {
        <div class="block">
          <span class="c-label" id="soon-label">Coming soon</span>
          <div class="c-seg" role="group" aria-labelledby="soon-label">
            <button type="button" [attr.aria-pressed]="soonValue() === 'off'" (click)="setSoon('off')">Off</button>
            <button type="button" [attr.aria-pressed]="soonValue() === 'now'" (click)="setSoon('now')">Right away</button>
            <button type="button" [attr.aria-pressed]="soonValue() === 'at'" (click)="setSoon('at')">From</button>
          </div>
          @if (soonValue() === 'at' && comingSoonAt(); as soonAt) {
            <label class="c-label sr-only" for="soon-at">Coming soon from</label>
            <input id="soon-at" class="c-input soon-at" type="datetime-local" [formControl]="soonAt">
          }
          <p class="c-hint">
            {{ soonValue() === 'off' ? 'Stays hidden until the release.' : 'Shown with a greyed-out download until the release.' }}
          </p>
        </div>

        @if (soonValue() !== 'off' && comingSoonPushOn(); as soonPushOn) {
          <label class="check">
            <input type="checkbox" [formControl]="soonPushOn">
            <span><strong>Push when it is coming soon</strong></span>
          </label>
          @if (soonPushOn.value && comingSoonPush(); as soonPush) {
            <label class="c-label sr-only" for="soon-push">Coming soon push</label>
            <input id="soon-push" class="c-input push-text" [formControl]="soonPush" maxlength="150">
          }
        }
      }

      @if (shown()) {
        <label class="check">
          <input type="checkbox" [formControl]="push()">
          <span><strong>{{ pushLabel() }}</strong></span>
        </label>
        @if (push().value && pushText(); as text) {
          <label class="c-label sr-only" for="push-text">Push text</label>
          <input id="push-text" class="c-input push-text" [formControl]="text" maxlength="150">
        }
        @if (webhook(); as toWebhooks) {
          @if (webhookNames().length) {
            <label class="check">
              <input type="checkbox" [formControl]="toWebhooks">
              <span>
                <strong>Post to webhooks</strong>
                <span class="hint">{{ webhookNames().join(', ') }}, {{ planned() ? 'once it is out' : 'once it is live' }}</span>
              </span>
            </label>
          }
        }
      }
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

    .block {
      margin-top: 14px;
    }

    .block .c-hint {
      margin: 6px 0 0;
    }

    .soon-at {
      margin-top: 8px;
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

    .push-text {
      margin-top: 8px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `
})
export class PublishingCard {
  readonly visibility = input.required<FormControl<Visibility>>();
  readonly push = input.required<FormControl<boolean>>();
  /** the release or publish moment, a datetime-local value */
  readonly moment = input.required<FormControl<string>>();
  readonly when = input.required<FormControl<PublishWhen>>();
  readonly pushText = input<FormControl<string> | null>(null);
  /** releases only */
  readonly comingSoon = input<FormControl<ComingSoon> | null>(null);
  readonly comingSoonAt = input<FormControl<string> | null>(null);
  readonly comingSoonPushOn = input<FormControl<boolean> | null>(null);
  readonly comingSoonPush = input<FormControl<string> | null>(null);
  readonly kind = input<'release' | 'post'>('release');
  /** “Post to webhooks”, shown when a webhook sends only what is ticked */
  readonly webhook = input<FormControl<boolean> | null>(null);
  readonly webhookNames = input<string[]>([]);

  protected readonly options = PUBLISH_OPTIONS;
  protected readonly isRelease = computed(() => this.kind() === 'release');

  protected shown() {
    return this.visibility().value !== 'PRIVATE';
  }

  protected planned() {
    return this.shown() && this.when().value === 'plan';
  }

  protected soonValue(): ComingSoon {
    return this.comingSoon()?.value ?? 'off';
  }

  protected setWhen(value: PublishWhen) {
    this.when().setValue(value);
    this.when().markAsDirty();
  }

  protected setSoon(value: ComingSoon) {
    this.comingSoon()?.setValue(value);
    this.comingSoon()?.markAsDirty();
  }

  protected momentLabel() {
    if (!this.isRelease()) return this.planned() ? 'Publish at' : 'Publish date';
    return 'Release';
  }

  protected momentHint() {
    const ahead = isAhead(this.moment().value);
    if (this.planned()) {
      const target = this.visibility().value === 'PUBLIC' ? 'public' : 'unlisted';
      return ahead ? `Private until then, ${target} at this moment on its own.` : 'A plan needs a moment that lies ahead.';
    }
    if (this.isRelease() && this.shown() && ahead) return 'Shown as coming soon until then, without download links.';
    return '';
  }

  protected pushLabel() {
    if (!this.planned()) return 'Send a push once it is live';
    return this.isRelease() ? 'Push when it is out' : 'Push when it is published';
  }
}
