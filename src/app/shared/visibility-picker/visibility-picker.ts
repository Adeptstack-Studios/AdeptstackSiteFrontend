import {Component, EventEmitter, Input, Output} from '@angular/core';

export type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  {value: 'PUBLIC', label: 'Public', hint: 'Listed everywhere'},
  {value: 'UNLISTED', label: 'Unlisted', hint: 'Only via direct link and in the app'},
  {value: 'PRIVATE', label: 'Private', hint: 'Admins only'},
];

/** Public / Unlisted / Private as one segmented control. Saving is up to the parent. */
@Component({
  selector: 'app-visibility-picker',
  templateUrl: './visibility-picker.html',
  styleUrl: './visibility-picker.css',
})
export class VisibilityPicker {
  @Input() value: Visibility = 'PRIVATE';
  @Input() disabled = false;
  @Output() changed = new EventEmitter<Visibility>();

  protected readonly options = VISIBILITY_OPTIONS;

  protected pick(next: Visibility) {
    if (!this.disabled && next !== this.value) {
      this.changed.emit(next);
    }
  }
}
