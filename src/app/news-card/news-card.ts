import {Component, Input} from '@angular/core';
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
}
