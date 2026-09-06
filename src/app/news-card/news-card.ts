import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe} from "@angular/common";
import {News} from '../models/news';

@Component({
  selector: 'app-news-card',
    imports: [
        DatePipe
    ],
  templateUrl: './news-card.html',
  styleUrl: './news-card.css'
})
export class NewsCard {
  @Input() item?: News;
  @Input() selected = false;
  @Output() postClicked = new EventEmitter<News>();

  onPostClicked() {
     this.postClicked.emit(this.item);
   }
}
