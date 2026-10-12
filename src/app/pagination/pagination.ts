import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ChevronLeft, ChevronRight, LucideAngularModule} from 'lucide-angular';
import {PAGE_SIZES, pageCount, pageWindow} from '../models/listing';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css'
})
export class Pagination {
  /** 1-based */
  @Input() page = 1;
  @Input() size = 10;
  @Input() total = 0;
  /** e.g. "posts" in "Showing 1–10 of 57 posts" */
  @Input() noun = 'entries';
  @Output() pageChange = new EventEmitter<number>();
  @Output() sizeChange = new EventEmitter<number>();

  readonly sizes = PAGE_SIZES;
  protected readonly icons = {ChevronLeft, ChevronRight};

  get pages() {
    return pageCount(this.total, this.size);
  }

  get window() {
    return pageWindow(this.page, this.pages);
  }

  get first() {
    return (this.page - 1) * this.size + 1;
  }

  get last() {
    return Math.min(this.page * this.size, this.total);
  }

  goTo(page: number) {
    if (page < 1 || page > this.pages || page === this.page) return;
    this.pageChange.emit(page);
  }

  setSize(size: number) {
    if (size !== this.size) this.sizeChange.emit(size);
  }
}
