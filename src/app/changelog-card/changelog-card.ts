import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe} from '@angular/common';
import {Changelogs} from '../models/changelogs';

@Component({
  selector: 'app-changelog-card',
  imports: [
    DatePipe
  ],
  templateUrl: './changelog-card.html',
  styleUrl: './changelog-card.css',
})
export class ChangelogCard {
  @Input() item?: Changelogs;
  @Output() postClicked = new EventEmitter<Changelogs>();

  onPostClicked() {
    this.postClicked.emit(this.item);
  }
}
