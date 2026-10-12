import {Component, computed, input} from '@angular/core';
import {channelKind} from '../versions';

const VISIBILITY_LABELS: Record<string, string> = {PUBLIC: 'Public', UNLISTED: 'Unlisted', PRIVATE: 'Private'};

/** Public / Unlisted / Private with a coloured dot. Never colour alone. */
@Component({
  selector: 'app-visibility-status',
  template: `<span class="c-status" [class]="cssClass()">{{ label() }}</span>`,
})
export class VisibilityStatus {
  readonly value = input<string | null | undefined>('PRIVATE');
  /** Private entries read as "Draft" in release lists */
  readonly privateLabel = input('Private');

  protected readonly cssClass = computed(() => (this.value() ?? 'PRIVATE').toLowerCase());
  protected readonly label = computed(() =>
    this.value() === 'PRIVATE' || !this.value() ? this.privateLabel() : VISIBILITY_LABELS[this.value()!] ?? this.value());
}

/** A release channel; stable-like ones green, beta-like ones orange. */
@Component({
  selector: 'app-channel-chip',
  template: `<span class="c-chip" [class]="kind()">{{ name() }}</span>`,
})
export class ChannelChip {
  readonly name = input<string | null | undefined>('');

  protected readonly kind = computed(() => channelKind(this.name()));
}
