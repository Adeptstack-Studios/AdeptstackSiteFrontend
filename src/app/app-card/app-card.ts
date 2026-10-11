import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe} from '@angular/common';
import {AppResponse} from '../models/app-response';

@Component({
  selector: 'app-app-card',
  imports: [
    DatePipe
  ],
  templateUrl: './app-card.html',
  styleUrl: '../shared/styles/entry-card.css',
})
export class AppCard {
  @Input() item?: AppResponse;
  @Output() appClicked = new EventEmitter<AppResponse>();

  onAppClicked() {
    this.appClicked.emit(this.item);
  }
}
