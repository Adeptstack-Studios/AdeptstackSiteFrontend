import {Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {DatePipe} from '@angular/common';
import {Changelogs} from '../models/changelogs';
import {AppService} from '../services/app-service';

@Component({
  selector: 'app-changelog-card',
  standalone: true,
  imports: [
    DatePipe
  ],
  templateUrl: './changelog-card.html',
  styleUrl: '../shared/styles/entry-card.css',
})
export class ChangelogCard implements OnInit, OnChanges {
  @Input() item?: Changelogs;
  @Input() selected = false;
  @Output() postClicked = new EventEmitter<Changelogs>();

  appService = inject(AppService);
  appName: string = 'Loading...';

  ngOnInit() {
    this.loadAppName();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && !changes['item'].isFirstChange()) {
      this.loadAppName();
    }
  }

  private loadAppName() {
    if (this.item?.appId) {
      this.appService.getById(this.item.appId).subscribe({
        next: (response) => {
          if (response.body) {
            this.appName = response.body.name || 'Unknown App';
          }
        },
        error: () => {
          this.appName = 'Unknown App';
        }
      });
    } else {
      this.appName = 'Unknown App';
    }
  }

  onPostClicked() {
    this.postClicked.emit(this.item);
  }
}
