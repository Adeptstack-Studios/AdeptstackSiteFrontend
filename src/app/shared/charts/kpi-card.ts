import {Component, computed, input} from '@angular/core';

/** A key figure with its trend against the range before and a small line of its days. */
@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="c-card kpi" [style.--kpi]="color()">
      <div class="c-kpi-label">{{ label() }}</div>
      <div class="value-line">
        <span class="c-kpi-value">{{ value() }}</span>
        @if (trend() !== null) {
          <span class="trend" [class.down]="trend()! < 0">{{ trend()! > 0 ? '+' : '' }}{{ trend() }}%</span>
        }
      </div>
      @if (spark().length > 1) {
        <svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          <path [attr.d]="sparkPath()"></path>
        </svg>
      }
      <div class="c-kpi-note">{{ note() }}</div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .kpi {
      height: 100%;
    }

    .value-line {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .trend {
      padding: 1px 6px;
      border-radius: 6px;
      background: var(--good-soft);
      color: var(--good);
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
    }

    .trend.down {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .spark {
      display: block;
      width: 100%;
      height: 26px;
      margin-top: 8px;
    }

    .spark path {
      fill: none;
      stroke: var(--kpi, var(--accent));
      stroke-width: 1.6;
      vector-effect: non-scaling-stroke;
    }
  `
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly note = input('');
  /** percent against the range before, null to hide */
  readonly trend = input<number | null>(null);
  readonly color = input('var(--accent)');
  /** the values per day, for the small line */
  readonly spark = input<number[]>([]);

  protected readonly sparkPath = computed(() => {
    const values = this.spark();
    const max = Math.max(1, ...values);
    return 'M' + values.map((value, i) =>
      `${(i * 100 / (values.length - 1)).toFixed(1)},${(22 - value / max * 20).toFixed(1)}`).join(' L');
  });
}
