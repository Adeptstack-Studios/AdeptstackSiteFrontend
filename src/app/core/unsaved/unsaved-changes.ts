import {CanDeactivateFn} from '@angular/router';

/** A page that may hold work which would be lost by leaving it. */
export interface HasUnsavedChanges {
  /** true or a confirmed dialog lets the router leave */
  canLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => component.canLeave();
