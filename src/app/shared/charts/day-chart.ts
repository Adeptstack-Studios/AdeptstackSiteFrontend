import {Component, computed, input} from '@angular/core';
import {ChartSeries, compact, niceMax, shortDay} from './chart-series';

const WIDTH = 600;
const HEIGHT = 200;

/**
 * Values per day as lines with a soft area, or as stacked bars. The SVG stretches to the card;
 * labels stay in HTML so they never get distorted. Every day has a tooltip with all values.
 */
@Component({
  selector: 'app-day-chart',
  template: `
    <div class="chart" [style.height.px]="height()">
      <div class="y-axis" aria-hidden="true">
        <span>{{ compact(max()) }}</span>
        <span>{{ compact(Math.round(max() / 2)) }}</span>
        <span>0</span>
      </div>
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + chartHeight" preserveAspectRatio="none" role="img"
           [attr.aria-label]="summary()">
        @for (line of [0.5, 1]; track line) {
          <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="chartHeight * (1 - line)" [attr.y2]="chartHeight * (1 - line)" class="grid"></line>
        }
        <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="chartHeight" [attr.y2]="chartHeight" class="grid base"></line>

        @if (type() === 'bars') {
          @for (bar of bars(); track $index) {
            <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.width" [attr.height]="bar.height"
                  [attr.fill]="bar.color" rx="1.5"></rect>
          }
        } @else {
          @for (line of lines(); track line.label; let first = $first) {
            @if (first) {
              <path [attr.d]="line.area" [attr.fill]="line.color" class="area"></path>
            }
            <path [attr.d]="line.path" [attr.stroke]="line.color" class="line"></path>
          }
        }

        @for (slot of slots(); track $index) {
          <rect [attr.x]="slot.x" y="0" [attr.width]="slot.width" [attr.height]="chartHeight" class="hit">
            <title>{{ slot.title }}</title>
          </rect>
        }
      </svg>
    </div>
    <div class="x-axis" aria-hidden="true">
      <span>{{ firstLabel() }}</span>
      <span>{{ middleLabel() }}</span>
      <span>{{ lastLabel() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .chart {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      /* without this the svg keeps its own aspect ratio and grows out of the card */
      grid-template-rows: minmax(0, 1fr);
      gap: 8px;
    }

    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 11px;
      text-align: right;
      line-height: 1;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: visible;
    }

    .grid {
      stroke: var(--line);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .area {
      opacity: .14;
    }

    .line {
      fill: none;
      stroke-width: 2;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .hit {
      fill: transparent;
    }

    .hit:hover {
      fill: color-mix(in srgb, var(--text) 6%, transparent);
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
      margin: 6px 0 0 32px;
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 11px;
    }
  `
})
export class DayChart {
  /** yyyy-MM-dd per value */
  readonly days = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly type = input<'lines' | 'bars'>('lines');
  readonly height = input(200);

  protected readonly width = WIDTH;
  protected readonly chartHeight = HEIGHT;
  protected readonly compact = compact;
  protected readonly Math = Math;

  protected readonly max = computed(() => {
    const series = this.series();
    const count = this.days().length;
    let max = 0;
    for (let i = 0; i < count; i++) {
      const values = series.map(one => one.values[i] ?? 0);
      max = Math.max(max, this.type() === 'bars' ? values.reduce((a, b) => a + b, 0) : Math.max(...values, 0));
    }
    return niceMax(max);
  });

  private readonly step = computed(() => WIDTH / Math.max(1, this.days().length));

  protected readonly lines = computed(() => {
    const count = this.days().length;
    const x = (i: number) => count <= 1 ? WIDTH / 2 : i * WIDTH / (count - 1);
    const y = (value: number) => HEIGHT - value / this.max() * HEIGHT;
    return this.series().map(one => {
      const points = one.values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`);
      return {
        label: one.label,
        color: one.color,
        path: 'M' + points.join(' L'),
        area: `M${x(0)},${HEIGHT} L` + points.join(' L') + ` L${x(count - 1)},${HEIGHT} Z`,
      };
    });
  });

  protected readonly bars = computed(() => {
    const step = this.step();
    const width = Math.max(1, step * 0.7);
    const bars: { x: number; y: number; width: number; height: number; color: string }[] = [];
    this.days().forEach((_, i) => {
      let top = HEIGHT;
      for (const one of this.series()) {
        const height = (one.values[i] ?? 0) / this.max() * HEIGHT;
        if (height <= 0) continue;
        top -= height;
        bars.push({x: i * step + (step - width) / 2, y: top, width, height, color: one.color});
      }
    });
    return bars;
  });

  /** an invisible column per day for the tooltip */
  protected readonly slots = computed(() => {
    const step = this.step();
    const isLines = this.type() === 'lines';
    const count = this.days().length;
    return this.days().map((day, i) => ({
      x: isLines ? Math.max(0, (count <= 1 ? 0 : i * WIDTH / (count - 1)) - step / 2) : i * step,
      width: step,
      title: shortDay(day) + '\n' + this.series().map(one => `${one.label}: ${(one.values[i] ?? 0).toLocaleString('en-US')}`).join('\n'),
    }));
  });

  protected readonly summary = computed(() => {
    const totals = this.series().map(one => `${one.label} ${one.values.reduce((a, b) => a + b, 0).toLocaleString('en-US')}`);
    return `${this.firstLabel()} to ${this.lastLabel()}: ${totals.join(', ')}`;
  });

  protected readonly firstLabel = computed(() => this.days().length ? shortDay(this.days()[0]) : '');
  protected readonly middleLabel = computed(() => {
    const days = this.days();
    return days.length > 2 ? shortDay(days[Math.floor(days.length / 2)]) : '';
  });
  protected readonly lastLabel = computed(() => {
    const days = this.days();
    return days.length > 1 ? 'Today' : '';
  });
}
