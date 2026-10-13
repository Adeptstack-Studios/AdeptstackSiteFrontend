import {Directive, inject} from '@angular/core';
import {CurrentUser} from '../../core/auth/current-user';

/**
 * Hides create, save, delete and bulk actions from viewers. Only a convenience:
 * the backend refuses those requests for viewers anyway.
 */
@Directive({
  selector: '[appEditOnly]',
  host: {'[hidden]': '!currentUser.canEdit()'}
})
export class EditOnly {
  protected readonly currentUser = inject(CurrentUser);
}
