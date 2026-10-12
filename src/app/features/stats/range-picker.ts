import {Component, input, model} from '@angular/core';

/** 7 / 30 / 90 days, the same on every statistics view. */
@Component({
  selector: 'app-range-picker',
  template: `
    <div class="c-seg" role="group" aria-label="Time range">
      @for (days of options(); track days) {
        <button type="button" [attr.aria-pressed]="range() === days" (click)="range.set(days)">{{ days }}d</button>
      }
    </div>
  `
})
export class RangePicker {
  readonly range = model(30);
  readonly options = input([7, 30, 90]);
}
