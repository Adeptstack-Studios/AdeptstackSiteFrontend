import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-warning',
  imports: [
  ],
  templateUrl: './warning.html',
  styleUrl: './warning.css',
})
export class Warning {
  @Output() delete = new EventEmitter<boolean>();

  onCloseModal() {
    this.delete.emit(false);
  }

  onDelete() {
    this.delete.emit(true);
  }
}
