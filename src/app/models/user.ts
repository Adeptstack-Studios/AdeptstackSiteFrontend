import {Role} from './team';

export class User {
  id?: number;
  username?: string;
  role?: Role;
  /** set while the account still has a start password from an owner */
  mustChangePassword?: boolean;
}
