import {Component, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Copy, KeyRound, Link, LucideAngularModule, Trash2, UserPlus} from 'lucide-angular';
import {TeamService} from '../../services/team-service';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {ToastService} from '../../services/toast-service';
import {InviteInfo, PASSWORD_MAX, PASSWORD_MIN, Role, ROLE_INFO, ROLES, TeamMember} from '../../models/team';
import {RelativeTimePipe} from '../../shared/ui/relative-day';

/** Readable without look-alikes such as l/1 and O/0. */
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function startPassword(length = 16) {
  const random = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(random, value => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('');
}

/** Who may open the console, with which role; invite links and start passwords. Owners only. */
@Component({
  selector: 'app-team-page',
  imports: [ReactiveFormsModule, LucideAngularModule, DatePipe, RelativeTimePipe],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Team &amp; roles</h1>
            <p class="c-sub">Who can open the console and what they may do</p>
          </div>
        </header>

        <section class="roles" aria-label="Roles">
          @for (role of roles; track role) {
            <div class="role-card">
              <strong>{{ info[role].label }}</strong>
              <span class="c-muted">{{ info[role].note }}</span>
            </div>
          }
        </section>

        @if (secret(); as shown) {
          <section class="c-card secret" aria-live="polite">
            <div class="c-card-head">
              <h2>{{ shown.title }}</h2>
              <button type="button" class="c-btn c-btn-sm close" (click)="secret.set(null)">Done</button>
            </div>
            <div class="secret-row">
              <code class="secret-value">{{ shown.value }}</code>
              <button type="button" class="c-btn c-btn-sm" (click)="copy(shown.value)">
                <lucide-icon [img]="icons.Copy" [size]="15" aria-hidden="true"></lucide-icon> Copy
              </button>
            </div>
            <p class="c-hint">{{ shown.note }}</p>
          </section>
        }

        <div class="c-grid-2 forms">
          <section class="c-card" aria-labelledby="invite-heading">
            <div class="c-card-head">
              <lucide-icon [img]="icons.Link" [size]="17" aria-hidden="true"></lucide-icon>
              <h2 id="invite-heading">Invite link</h2>
            </div>
            <p class="c-muted lead">You choose the name, the person only their password. The link works once, for 7 days.</p>
            <form [formGroup]="inviteForm" (ngSubmit)="createInvite()" class="add-form">
              <div class="row">
                <div class="grow">
                  <label class="c-label" for="invite-name">Username</label>
                  <input id="invite-name" class="c-input" formControlName="username" spellcheck="false" autocomplete="off">
                </div>
                <div>
                  <label class="c-label" for="invite-role">Role</label>
                  <select id="invite-role" class="c-input select" formControlName="role">
                    @for (role of roles; track role) {
                      <option [value]="role">{{ info[role].label }}</option>
                    }
                  </select>
                </div>
              </div>
              @if (inviteForm.touched && inviteForm.invalid) {
                <p class="c-error">3 to 32 letters, digits, dots, dashes or underscores.</p>
              }
              <div><button type="submit" class="c-btn c-btn-primary" [disabled]="busy()">Create link</button></div>
            </form>
          </section>

          <section class="c-card" aria-labelledby="add-heading">
            <div class="c-card-head">
              <lucide-icon [img]="icons.UserPlus" [size]="17" aria-hidden="true"></lucide-icon>
              <h2 id="add-heading">Add with a start password</h2>
            </div>
            <form [formGroup]="addForm" (ngSubmit)="add()" class="add-form">
              <div class="row">
                <div class="grow">
                  <label class="c-label" for="add-name">Username</label>
                  <input id="add-name" class="c-input" formControlName="username" spellcheck="false" autocomplete="off">
                </div>
                <div>
                  <label class="c-label" for="add-role">Role</label>
                  <select id="add-role" class="c-input select" formControlName="role">
                    @for (role of roles; track role) {
                      <option [value]="role">{{ info[role].label }}</option>
                    }
                  </select>
                </div>
              </div>
              <div>
                <label class="c-label" for="add-password">Start password</label>
                <div class="row">
                  <input id="add-password" class="c-input mono grow" formControlName="password" autocomplete="off" spellcheck="false">
                  <button type="button" class="c-btn" (click)="addForm.controls.password.setValue(generate())">Generate</button>
                </div>
              </div>
              @if (addForm.touched && addForm.invalid) {
                <p class="c-error">Username: 3 to 32 letters, digits, dots, dashes or underscores. Password: {{ min }} to {{ max }} characters.</p>
              } @else {
                <p class="c-hint">They have to replace it at the first sign-in.</p>
              }
              <div><button type="submit" class="c-btn c-btn-primary" [disabled]="busy()">Add member</button></div>
            </form>
          </section>
        </div>

        <section class="c-card c-card-flush" aria-labelledby="members-heading">
          <div class="c-card-head pad"><h2 id="members-heading">Members</h2></div>
          @if (members(); as list) {
            <div class="c-table-wrap">
              <table class="c-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Last sign-in</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (member of list; track member.id) {
                    <tr>
                      <td>
                        <strong>{{ member.username }}</strong>
                        @if (member.you) { <span class="c-chip you">you</span> }
                        @if (member.createdAt) { <div class="c-muted small">since {{ member.createdAt | date: 'MMM d, y' }}</div> }
                      </td>
                      <td>
                        @if (member.you) {
                          {{ member.role ? info[member.role].label : '–' }}
                        } @else {
                          <label class="sr-only" [for]="'role-' + member.id">Role of {{ member.username }}</label>
                          <select [id]="'role-' + member.id" class="c-input select small-select"
                                  (change)="changeRole(member, $any($event.target).value)">
                            @for (role of roles; track role) {
                              <option [value]="role" [selected]="role === member.role">{{ info[role].label }}</option>
                            }
                          </select>
                        }
                      </td>
                      <td class="c-muted" [title]="member.lastLoginAt ? (member.lastLoginAt | date: 'MMM d, y, HH:mm') : ''">
                        {{ member.lastLoginAt ? (member.lastLoginAt | relativeTime) : 'never' }}
                      </td>
                      <td>
                        @if (member.mustChangePassword) {
                          <span class="c-status unlisted">Start password</span>
                        } @else {
                          <span class="c-status public">Active</span>
                        }
                      </td>
                      <td class="actions">
                        @if (!member.you) {
                          <button type="button" class="c-btn c-btn-sm" (click)="resetPassword(member)"
                                  [attr.aria-label]="'New start password for ' + member.username" title="New start password">
                            <lucide-icon [img]="icons.KeyRound" [size]="15" aria-hidden="true"></lucide-icon>
                          </button>
                          <button type="button" class="c-btn c-btn-sm c-btn-danger" (click)="remove(member)"
                                  [attr.aria-label]="'Remove ' + member.username" title="Remove from the team">
                            <lucide-icon [img]="icons.Trash2" [size]="15" aria-hidden="true"></lucide-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="c-skeleton c-list-skeleton"></div>
          }
        </section>

        @if (invites()?.length) {
          <section class="c-card c-card-flush" aria-labelledby="invites-heading">
            <div class="c-card-head pad"><h2 id="invites-heading">Open invite links</h2></div>
            <div class="c-table-wrap">
              <table class="c-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Created</th>
                    <th scope="col">Valid until</th>
                    <th scope="col"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (invite of invites(); track invite.id) {
                    <tr>
                      <td><strong>{{ invite.username }}</strong></td>
                      <td>{{ info[invite.role].label }}</td>
                      <td class="c-muted">{{ invite.createdAt | relativeTime }}{{ invite.createdBy ? ' by ' + invite.createdBy : '' }}</td>
                      <td class="c-muted">{{ invite.expiresAt | date: 'MMM d, HH:mm' }}</td>
                      <td class="actions">
                        <button type="button" class="c-btn c-btn-sm" (click)="revoke(invite)">Revoke</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .roles {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .role-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
      font-size: 13.5px;
    }

    .forms {
      align-items: start;
    }

    .lead {
      margin: 0 0 14px;
      font-size: 13.5px;
    }

    .row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .grow {
      flex: 1;
      min-width: 160px;
    }

    .select {
      width: auto;
      min-width: 120px;
    }

    .small-select {
      height: 32px;
    }

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .add-form p {
      margin: -4px 0 0;
    }

    .pad {
      padding: 16px 16px 0;
    }

    .you {
      margin-left: 6px;
    }

    .small {
      font-size: 12px;
    }

    .actions {
      text-align: right;
      white-space: nowrap;
    }

    .actions .c-btn + .c-btn {
      margin-left: 6px;
    }

    .secret {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .close {
      margin-left: auto;
    }

    .secret-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .secret-value {
      flex: 1;
      min-width: 0;
      padding: 9px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--panel);
      font-family: var(--font-mono);
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .secret .c-hint {
      margin: 10px 0 0;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    @media (max-width: 760px) {
      .roles {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `
})
export class TeamPage {
  private readonly team = inject(TeamService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly roles = ROLES;
  protected readonly info = ROLE_INFO;
  protected readonly min = PASSWORD_MIN;
  protected readonly max = PASSWORD_MAX;
  protected readonly icons = {Copy, KeyRound, Link, Trash2, UserPlus};
  protected readonly generate = startPassword;

  protected readonly members = signal<TeamMember[] | null>(null);
  protected readonly invites = signal<InviteInfo[] | null>(null);
  protected readonly busy = signal(false);
  /** a link or start password, shown once right after it was made */
  protected readonly secret = signal<{ title: string; value: string; note: string } | null>(null);

  protected readonly inviteForm = new FormGroup({
    username: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,32}$/)]}),
    role: new FormControl<Role>('EDITOR', {nonNullable: true}),
  });
  protected readonly addForm = new FormGroup({
    username: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,32}$/)]}),
    role: new FormControl<Role>('EDITOR', {nonNullable: true}),
    password: new FormControl(startPassword(), {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)]
    }),
  });

  constructor() {
    this.load();
  }

  protected createInvite() {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const {username, role} = this.inviteForm.getRawValue();
    this.team.invite(username.trim(), role).subscribe({
      next: invite => {
        this.busy.set(false);
        this.secret.set({
          title: `Invite link for ${invite.username} (${ROLE_INFO[role].label.toLowerCase()})`,
          // after #, so the token never shows up in a server log
          value: `${location.origin}/join#${invite.token}`,
          note: 'Shown only now. Send it yourself, for example on Discord. Anyone with the link can join once, until '
            + new Date(invite.expiresAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + '.',
        });
        this.inviteForm.reset({username: '', role: 'EDITOR'});
        this.loadInvites();
      },
      error: () => this.busy.set(false),
    });
  }

  protected add() {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const {username, role, password} = this.addForm.getRawValue();
    this.busy.set(true);
    this.team.addMember(username.trim(), password, role).subscribe({
      next: member => {
        this.busy.set(false);
        this.secret.set({
          title: `Start password for ${member.username}`,
          value: password,
          note: 'Shown only now. Give it to them yourself; they choose their own password at the first sign-in.',
        });
        this.addForm.reset({username: '', role: 'EDITOR', password: startPassword()});
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  protected changeRole(member: TeamMember, role: Role) {
    this.team.changeRole(member.id, role).subscribe({
      next: () => {
        this.toast.success(`${member.username} is ${article(role)} ${ROLE_INFO[role].label.toLowerCase()} now.`);
        this.load();
      },
      // e.g. the last owner: put the select back
      error: () => this.load(),
    });
  }

  protected async resetPassword(member: TeamMember) {
    const ok = await this.confirm.ask({
      title: `New start password for ${member.username}?`,
      message: 'Their current password stops working and they are signed out everywhere. At the next sign-in they choose a new one.',
      confirmLabel: 'Set start password',
    });
    if (!ok) return;
    const password = startPassword();
    this.team.resetPassword(member.id, password).subscribe(() => {
      this.secret.set({
        title: `New start password for ${member.username}`,
        value: password,
        note: 'Shown only now. Give it to them yourself.',
      });
      this.load();
    });
  }

  protected async remove(member: TeamMember) {
    const ok = await this.confirm.ask({
      title: `Remove ${member.username}?`,
      message: 'They are signed out at once and cannot sign in again. What they did stays in the activity log.',
      confirmLabel: 'Remove from team',
      danger: true,
    });
    if (!ok) return;
    this.team.remove(member.id).subscribe(() => {
      this.toast.success(`${member.username} is no longer in the team.`);
      this.load();
    });
  }

  protected revoke(invite: InviteInfo) {
    this.team.revokeInvite(invite.id).subscribe(() => {
      this.toast.success('The link does not work anymore.');
      this.loadInvites();
    });
  }

  protected copy(value: string) {
    navigator.clipboard.writeText(value).then(
      () => this.toast.success('Copied.'),
      () => this.toast.error('Copying did not work. Select the text and copy it yourself.'));
  }

  private load() {
    this.team.members().subscribe(members => this.members.set(members));
    this.loadInvites();
  }

  private loadInvites() {
    this.team.invites().subscribe(invites => this.invites.set(invites));
  }
}

function article(role: Role) {
  return role === 'VIEWER' ? 'a' : 'an';
}
