export class LoginResponse {
  token?: string;
  /** the account has a start password; the console asks for an own one before anything else */
  mustChangePassword?: boolean;
}
