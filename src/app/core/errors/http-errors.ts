import {HttpContext, HttpContextToken, HttpErrorResponse} from '@angular/common/http';

/**
 * Set on a request whose failure the caller reports itself (or that is allowed to fail
 * quietly, like the session check), so the global error toast does not show twice.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function quietRequest(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true);
}

/** Turns a failed request into a sentence a person can act on. */
export function errorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Can\'t reach the server. Check your connection and try again.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error.status === 413) {
    return 'The file is too large to upload.';
  }

  const fromServer = serverMessage(error.error);
  if (fromServer) {
    return fromServer;
  }
  if (error.status === 403) {
    return 'You\'re not allowed to do that. If this keeps happening, sign in again.';
  }
  if (error.status === 404) {
    return 'That entry doesn\'t exist anymore. Reload the page.';
  }
  if (error.status >= 500) {
    return 'Something went wrong on the server. Please try again.';
  }
  return `The request failed (${error.status}).`;
}

/** Spring answers with {message: …} or a plain text body; anything else is not worth showing. */
function serverMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    const text = body.trim();
    return text && !text.startsWith('<') && text.length < 300 ? text : null;
  }
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }
  return null;
}
