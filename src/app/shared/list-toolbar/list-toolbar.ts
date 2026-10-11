import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Bell, Eye, LucideAngularModule, Search} from 'lucide-angular';
import {PushSelection} from '../listing/push-selection';

/**
 * Header of a list page: title, the page's own filters (projected with `filters`),
 * push selection, "make all visible" and search.
 */
@Component({
  selector: 'app-list-toolbar',
  imports: [LucideAngularModule],
  templateUrl: './list-toolbar.html',
  styleUrl: './list-toolbar.css',
})
export class ListToolbar {
  @Input({required: true}) heading = '';
  /** Leave out for lists without pushes (apps). */
  @Input() selection?: PushSelection;
  @Input() searchPlaceholder = 'Search';
  @Output() searched = new EventEmitter<string>();
  @Output() publishAll = new EventEmitter<void>();

  protected readonly icons = {Bell, Eye, Search};

  protected onSearch(event: Event) {
    this.searched.emit((event.target as HTMLInputElement).value);
  }
}
