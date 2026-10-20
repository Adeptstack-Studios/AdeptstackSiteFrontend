import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, of} from 'rxjs';
import {ChevronDown, LucideAngularModule, Pencil, Send, Trash2} from 'lucide-angular';
import {WebhookService} from '../../services/webhook-service';
import {ConsoleService} from '../../services/console-service';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {ToastService} from '../../services/toast-service';
import {
  DELIVERY_LABELS, DeliveryStatus, EVENT_OPTIONS, SEND_ON_OPTIONS, Webhook, WebhookDelivery, WebhookEvent,
  WebhookRequest, WebhookSendOn
} from '../../models/webhooks';

/** Webhooks, e.g. a Discord channel that hears about every release. Owners only. */
@Component({
  selector: 'app-webhooks-page',
  imports: [FormsModule, LucideAngularModule, DatePipe],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Webhooks</h1>
            <p class="c-sub">Releases and posts to Discord, or anywhere else that takes a webhook</p>
          </div>
        </header>

        <section class="c-card c-card-flush" aria-labelledby="list-heading">
          <div class="c-card-head pad"><h2 id="list-heading">Your webhooks</h2></div>
          @if (webhooks(); as list) {
            @if (list.length) {
              <ul class="hooks">
                @for (hook of list; track hook.id) {
                  <li class="hook" [class.off]="!hook.enabled">
                    <div class="hook-main">
                      <div class="hook-title">
                        <strong>{{ hook.name }}</strong>
                        <span class="c-chip">{{ hook.format === 'DISCORD' ? 'Discord' : 'JSON' }}</span>
                        @if (!hook.enabled) { <span class="c-chip">off</span> }
                      </div>
                      <p class="c-muted meta mono">{{ hook.urlPreview }}</p>
                      <p class="meta">{{ describe(hook) }}</p>
                      @if (hook.last; as last) {
                        <p class="meta">
                          <span class="delivery" [attr.data-status]="last.status">{{ statusLabel(last.status) }}</span>
                          {{ last.about }} · {{ (last.attemptedAt ?? last.createdAt) | date: 'MMM d, HH:mm' }}
                          @if (last.error) { <span class="err">· {{ last.error }}</span> }
                        </p>
                      } @else {
                        <p class="meta c-muted">Nothing sent yet.</p>
                      }
                    </div>
                    <div class="hook-actions">
                      <button type="button" class="c-btn c-btn-sm" (click)="test(hook)" [disabled]="testing() === hook.id">
                        <lucide-icon [img]="icons.Send" [size]="14" aria-hidden="true"></lucide-icon> Test
                      </button>
                      <button type="button" class="c-btn c-btn-sm" (click)="edit(hook)" [attr.aria-label]="'Edit ' + hook.name">
                        <lucide-icon [img]="icons.Pencil" [size]="14" aria-hidden="true"></lucide-icon>
                      </button>
                      <button type="button" class="c-btn c-btn-sm" (click)="toggleEnabled(hook)">{{ hook.enabled ? 'Switch off' : 'Switch on' }}</button>
                      <button type="button" class="c-btn c-btn-sm" (click)="toggleLog(hook)" [attr.aria-expanded]="open() === hook.id">
                        Log <lucide-icon [img]="icons.ChevronDown" [size]="14" aria-hidden="true" [class.turned]="open() === hook.id"></lucide-icon>
                      </button>
                      <button type="button" class="c-btn c-btn-sm c-btn-danger" (click)="remove(hook)" [attr.aria-label]="'Remove ' + hook.name">
                        <lucide-icon [img]="icons.Trash2" [size]="14" aria-hidden="true"></lucide-icon>
                      </button>
                    </div>
                    @if (open() === hook.id) {
                      <div class="log">
                        @if (log(); as entries) {
                          @if (entries.length) {
                            <div class="c-table-wrap">
                              <table class="c-table">
                                <thead>
                                  <tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Status</th><th scope="col">Note</th></tr>
                                </thead>
                                <tbody>
                                  @for (entry of entries; track entry.id) {
                                    <tr>
                                      <td class="c-muted nowrap">{{ (entry.attemptedAt ?? entry.createdAt) | date: 'MMM d, HH:mm' }}</td>
                                      <td>{{ entry.about }} <span class="c-muted">· {{ eventLabel(entry.event) }}</span></td>
                                      <td><span class="delivery" [attr.data-status]="entry.status">{{ statusLabel(entry.status) }}</span>
                                        @if (entry.attempts > 1) { <span class="c-muted"> ×{{ entry.attempts }}</span> }</td>
                                      <td class="c-muted">{{ entry.error ?? (entry.httpStatus ? 'Answered ' + entry.httpStatus : '') }}</td>
                                    </tr>
                                  }
                                </tbody>
                              </table>
                            </div>
                          } @else {
                            <p class="c-empty">Nothing yet.</p>
                          }
                        } @else {
                          <div class="c-skeleton c-list-skeleton"></div>
                        }
                      </div>
                    }
                  </li>
                }
              </ul>
            } @else {
              <p class="c-empty">No webhooks yet. Add one below, e.g. for a Discord channel.</p>
            }
          } @else {
            <div class="c-skeleton c-list-skeleton"></div>
          }
        </section>

        <div class="c-grid-2 top">
          <section class="c-card" aria-labelledby="form-heading">
            <div class="c-card-head">
              <h2 id="form-heading">{{ editing() ? 'Edit “' + editing()!.name + '”' : 'Add a webhook' }}</h2>
            </div>
            <form (ngSubmit)="save()" class="form">
              <div>
                <label class="c-label" for="name">Name</label>
                <input id="name" name="name" class="c-input" [(ngModel)]="name" maxlength="80" autocomplete="off"
                       placeholder="e.g. Discord #releases">
              </div>
              <div>
                <label class="c-label" for="url">Address</label>
                <input id="url" name="url" class="c-input mono" type="url" [(ngModel)]="url" autocomplete="off" spellcheck="false"
                       [placeholder]="editing() ? 'Empty keeps ' + editing()!.urlPreview : 'https://discord.com/api/webhooks/…'">
                <p class="c-hint">Discord addresses get messages with picture and version, any other address a JSON description.</p>
              </div>
              <div>
                <span class="c-label" id="send-label">Sends</span>
                <div class="c-seg" role="group" aria-labelledby="send-label">
                  @for (option of sendOnOptions; track option.value) {
                    <button type="button" [attr.aria-pressed]="sendOn === option.value" (click)="sendOn = option.value">{{ option.label }}</button>
                  }
                </div>
                <p class="c-hint">{{ sendOnNote() }}</p>
              </div>
              <div>
                <span class="c-label" id="events-label">About</span>
                <div class="c-chips" role="group" aria-labelledby="events-label">
                  @for (option of eventOptions; track option.value) {
                    <button type="button" class="c-chip-btn" [attr.aria-pressed]="events.has(option.value)"
                            (click)="toggleEvent(option.value)">{{ option.label }}</button>
                  }
                </div>
                @if (events.has('APP') && sendOn !== 'ALWAYS') {
                  <p class="c-hint">New apps have no push and no tick, they only go out with “Always”.</p>
                }
              </div>
              <div>
                <span class="c-label" id="apps-label">Apps</span>
                <div class="c-chips" role="group" aria-labelledby="apps-label">
                  <button type="button" class="c-chip-btn" [attr.aria-pressed]="!appIds.size" (click)="appIds.clear()">All apps</button>
                  @for (app of apps(); track app.id) {
                    <button type="button" class="c-chip-btn" [attr.aria-pressed]="appIds.has(app.id)" (click)="toggleApp(app.id)">{{ app.name }}</button>
                  }
                </div>
                <p class="c-hint">{{ appIds.size ? 'Posts only when they are about one of these apps.' : 'Every app, and posts without an app too.' }}</p>
              </div>
              <div>
                <label class="c-label" for="mention">Text before each message <span class="c-muted">(optional)</span></label>
                <input id="mention" name="mention" class="c-input mono" [(ngModel)]="mention" maxlength="200" autocomplete="off"
                       placeholder="e.g. @everyone or <@&role id>">
              </div>
              <div class="form-actions">
                <button type="submit" class="c-btn c-btn-primary" [disabled]="busy()">{{ editing() ? 'Save changes' : 'Add webhook' }}</button>
                @if (editing()) { <button type="button" class="c-btn" (click)="reset()">Cancel</button> }
              </div>
            </form>
          </section>

          <section class="c-card" aria-labelledby="how-heading">
            <div class="c-card-head"><h2 id="how-heading">How it works</h2></div>
            <ul class="how">
              <li><strong>Always</strong> sends every new app, release and post when it goes public, coming soon included if chosen.</li>
              <li><strong>With pushes</strong> sends only when a push to the Adeptstack app goes out, with the push text above.</li>
              <li><strong>When ticked</strong> sends only releases and posts with “Post to webhooks” ticked in the editor.</li>
              <li>What is out already when a webhook is added is not sent after the fact. A failed message is tried again three times.</li>
            </ul>
            <h3 class="sub">A webhook for a Discord channel</h3>
            <ol class="how">
              <li>Open the channel's settings (the gear next to its name), then <strong>Integrations</strong> → <strong>Webhooks</strong>.</li>
              <li><strong>New Webhook</strong>, give it a name and picture, then <strong>Copy Webhook URL</strong>.</li>
              <li>Paste it here as the address and send a test message.</li>
            </ol>
          </section>
        </div>

      </div>
    </div>
  `,
  styles: `
    .top {
      align-items: start;
      margin-top: 16px;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form .c-hint {
      margin: 6px 0 0;
    }

    .form .c-chips {
      margin-top: 2px;
    }

    .form .c-chip-btn {
      height: 30px;
      padding: 0 12px;
      font-size: 13px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
    }

    .how {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13.5px;
    }

    .sub {
      margin: 18px 0 8px;
      font-size: 14px;
    }

    .pad {
      padding: 16px 16px 0;
    }

    .hooks {
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
    }

    .hook {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 16px;
      padding: 14px 16px;
      border-top: 1px solid var(--line);
    }

    .hook.off .hook-main {
      opacity: .6;
    }

    .hook-main {
      flex: 1;
      min-width: 240px;
    }

    .hook-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta {
      margin: 4px 0 0;
      font-size: 13px;
    }

    .err {
      color: var(--danger);
    }

    .hook-actions {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      flex-wrap: wrap;
    }

    .hook-actions .c-btn {
      gap: 6px;
    }

    .turned {
      transform: rotate(180deg);
    }

    .log {
      flex-basis: 100%;
    }

    .delivery {
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--panel-2);
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    .delivery[data-status="SENT"] {
      background: var(--good-soft);
      color: var(--good);
    }

    .delivery[data-status="FAILED"] {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .delivery[data-status="PENDING"] {
      background: var(--warn-soft);
      color: var(--warn);
    }

    .nowrap {
      white-space: nowrap;
    }
  `
})
export class WebhooksPage {
  private readonly service = inject(WebhookService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly icons = {ChevronDown, Pencil, Send, Trash2};
  protected readonly sendOnOptions = SEND_ON_OPTIONS;
  protected readonly eventOptions = EVENT_OPTIONS;
  protected readonly apps = toSignal(inject(ConsoleService).apps().pipe(catchError(() => of([]))), {initialValue: []});
  private readonly appNames = computed(() => new Map(this.apps().map(app => [app.id, app.name])));

  protected readonly webhooks = signal<Webhook[] | null>(null);
  protected readonly editing = signal<Webhook | null>(null);
  protected readonly busy = signal(false);
  protected readonly testing = signal<number | null>(null);
  protected readonly open = signal<number | null>(null);
  protected readonly log = signal<WebhookDelivery[] | null>(null);

  protected name = '';
  protected url = '';
  protected sendOn: WebhookSendOn = 'ALWAYS';
  protected events = new Set<WebhookEvent>(['RELEASE_OUT', 'POST']);
  protected appIds = new Set<number>();
  protected mention = '';

  constructor() {
    this.load();
  }

  protected sendOnNote() {
    return SEND_ON_OPTIONS.find(option => option.value === this.sendOn)!.note;
  }

  protected toggleEvent(event: WebhookEvent) {
    if (this.events.has(event)) this.events.delete(event);
    else this.events.add(event);
  }

  protected toggleApp(id: number) {
    if (this.appIds.has(id)) this.appIds.delete(id);
    else this.appIds.add(id);
  }

  /** "Always · release out, blog post · Activity Pulse" */
  protected describe(hook: Webhook) {
    const when = SEND_ON_OPTIONS.find(option => option.value === hook.sendOn)!.label;
    const about = hook.events.map(event => this.eventLabel(event).toLowerCase()).join(', ');
    const apps = hook.appIds.length ? hook.appIds.map(id => this.appNames().get(id) ?? '#' + id).join(', ') : 'all apps';
    return `${when} · ${about} · ${apps}${hook.mention ? ' · with “' + hook.mention + '”' : ''}`;
  }

  protected eventLabel(event: WebhookEvent | 'TEST') {
    return event === 'TEST' ? 'Test' : EVENT_OPTIONS.find(option => option.value === event)!.label;
  }

  protected statusLabel(status: DeliveryStatus) {
    return DELIVERY_LABELS[status];
  }

  protected save() {
    const editing = this.editing();
    if (!this.name.trim()) {
      this.toast.error('Give the webhook a name.');
      return;
    }
    if (!editing && !this.url.trim()) {
      this.toast.error('Enter the address of the webhook.');
      return;
    }
    if (!this.events.size) {
      this.toast.error('Choose at least one thing to send.');
      return;
    }
    const request: WebhookRequest = {
      name: this.name.trim(), url: this.url.trim(), sendOn: this.sendOn, events: [...this.events],
      appIds: [...this.appIds], mention: this.mention.trim() || null, enabled: editing?.enabled ?? true,
    };
    this.busy.set(true);
    (editing ? this.service.update(editing.id, request) : this.service.create(request)).subscribe({
      next: hook => {
        this.busy.set(false);
        this.toast.success(editing ? `“${hook.name}” saved.` : `“${hook.name}” added. What is out already is not sent again.`);
        this.service.forgetChoosable();
        this.reset();
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  protected edit(hook: Webhook) {
    this.editing.set(hook);
    this.name = hook.name;
    this.url = '';
    this.sendOn = hook.sendOn;
    this.events = new Set(hook.events);
    this.appIds = new Set(hook.appIds);
    this.mention = hook.mention ?? '';
    document.getElementById('name')?.focus();
  }

  protected reset() {
    this.editing.set(null);
    this.name = '';
    this.url = '';
    this.sendOn = 'ALWAYS';
    this.events = new Set(['RELEASE_OUT', 'POST']);
    this.appIds = new Set();
    this.mention = '';
  }

  protected test(hook: Webhook) {
    this.testing.set(hook.id);
    this.service.test(hook.id).subscribe({
      next: result => {
        this.testing.set(null);
        if (result.status === 'SENT') this.toast.success(`Test message sent to “${hook.name}”.`);
        else this.toast.error(`The test did not arrive: ${result.error ?? 'answered ' + result.httpStatus}`);
        this.load();
        if (this.open() === hook.id) this.loadLog(hook.id);
      },
      error: () => this.testing.set(null),
    });
  }

  protected toggleEnabled(hook: Webhook) {
    this.service.update(hook.id, {
      name: hook.name, url: '', sendOn: hook.sendOn, events: hook.events, appIds: hook.appIds,
      mention: hook.mention, enabled: !hook.enabled,
    }).subscribe(() => {
      this.toast.success(hook.enabled ? `“${hook.name}” is off. Nothing is sent until you switch it on again.`
        : `“${hook.name}” is on again. What went out meanwhile is not sent after the fact.`);
      this.service.forgetChoosable();
      this.load();
    });
  }

  protected toggleLog(hook: Webhook) {
    if (this.open() === hook.id) {
      this.open.set(null);
      return;
    }
    this.open.set(hook.id);
    this.loadLog(hook.id);
  }

  protected async remove(hook: Webhook) {
    if (!await this.confirm.ask({
      title: `Remove “${hook.name}”?`,
      message: 'Nothing is sent to it anymore, and its log is deleted. The webhook in Discord stays until you delete it there.',
      confirmLabel: 'Remove webhook', danger: true,
    })) return;
    this.service.delete(hook.id).subscribe(() => {
      this.toast.success('Webhook removed.');
      if (this.editing()?.id === hook.id) this.reset();
      this.service.forgetChoosable();
      this.load();
    });
  }

  private loadLog(id: number) {
    this.log.set(null);
    this.service.deliveries(id, 20).subscribe(entries => this.log.set(entries));
  }

  private load() {
    this.service.list().subscribe(list => this.webhooks.set(list));
  }
}
