/** When a webhook sends: everything that goes out, together with a push, or what is ticked in the editor. */
export type WebhookSendOn = 'ALWAYS' | 'PUSH' | 'CHOSEN';
export type WebhookEvent = 'APP' | 'RELEASE_OUT' | 'COMING_SOON' | 'POST';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface WebhookDelivery {
  id: number;
  kind: 'APP' | 'RELEASE' | 'POST' | 'TEST';
  event: WebhookEvent | 'TEST';
  /** the app name, "Activity Pulse 1.2.0 (stable)" or the post title */
  about: string;
  status: DeliveryStatus;
  attempts: number;
  createdAt: string;
  attemptedAt: string | null;
  httpStatus: number | null;
  error: string | null;
}

export interface Webhook {
  id: number;
  name: string;
  /** only a hint, the address is a secret: "discord.com …Qz3k" */
  urlPreview: string;
  format: 'DISCORD' | 'JSON';
  sendOn: WebhookSendOn;
  events: WebhookEvent[];
  /** empty for every app */
  appIds: number[];
  mention: string | null;
  enabled: boolean;
  createdBy: string | null;
  createdAt: string | null;
  last: WebhookDelivery | null;
}

/** An empty url keeps the stored address when editing. */
export interface WebhookRequest {
  name: string;
  url: string;
  sendOn: WebhookSendOn;
  events: WebhookEvent[];
  appIds: number[];
  mention: string | null;
  enabled: boolean;
}

export const SEND_ON_OPTIONS: { value: WebhookSendOn; label: string; note: string }[] = [
  {value: 'ALWAYS', label: 'Always', note: 'Everything that goes out, on its own.'},
  {value: 'PUSH', label: 'With pushes', note: 'Only together with a push, with the same text.'},
  {value: 'CHOSEN', label: 'When ticked', note: 'Only releases and posts ticked “Post to webhooks” in the editor.'},
];

export const EVENT_OPTIONS: { value: WebhookEvent; label: string }[] = [
  {value: 'APP', label: 'New app'},
  {value: 'RELEASE_OUT', label: 'Release out'},
  {value: 'COMING_SOON', label: 'Coming soon'},
  {value: 'POST', label: 'Blog post'},
];

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Waiting', SENT: 'Sent', FAILED: 'Failed', SKIPPED: 'Skipped',
};
