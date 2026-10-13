import {Component, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {LucideAngularModule, Trash2} from 'lucide-angular';
import {ReviewService} from '../../services/review-service';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {ToastService} from '../../services/toast-service';
import {ContentFinding, ContentRule, RULE_LEVELS} from '../../models/review';
import {FindingList} from './finding-list';

/** Own words for the content check, exceptions from it, and a box to try a text. Owners only. */
@Component({
  selector: 'app-content-rules-page',
  imports: [FormsModule, LucideAngularModule, DatePipe, FindingList],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Content check</h1>
            <p class="c-sub">Runs whenever a change is submitted for review</p>
          </div>
        </header>

        <section class="c-card" aria-labelledby="how-heading">
          <div class="c-card-head"><h2 id="how-heading">How it works</h2></div>
          <ul class="how">
            <li><strong>Blocked</strong> words cannot be submitted at all. <strong>Hints</strong> are shown to the reviewer next to the text.</li>
            <li>Words match as whole words, also with endings (spam → spammed), letter swaps (sp4m), gaps (s.p.a.m) and ae/oe/ue/ss for umlauts. A rule ending in <span class="mono">*</span> catches every word starting with it.</li>
            <li>Links to sites that appear nowhere on adeptstack.net yet are a hint too.</li>
            @if (builtIn(); as counts) {
              <li class="c-muted">
                Built in: {{ counts['BLOCK'] }} blocked, {{ counts['HINT'] }} hints and {{ counts['ALLOW'] }} exceptions, from the open
                <a class="c-link" href="https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words" target="_blank" rel="noopener">LDNOOBW list</a>
                (CC BY 4.0) and our own additions. Your rules below take precedence.
              </li>
            }
          </ul>
        </section>

        <div class="c-grid-2 top">
          <section class="c-card" aria-labelledby="add-heading">
            <div class="c-card-head"><h2 id="add-heading">Add a rule</h2></div>
            <form (ngSubmit)="add()" class="form">
              <div>
                <label class="c-label" for="term">Word or phrase</label>
                <input id="term" name="term" class="c-input" [(ngModel)]="term" autocomplete="off" spellcheck="false"
                       placeholder="e.g. clickbait or spam*">
              </div>
              <div>
                <span class="c-label" id="level-label">Effect</span>
                <div class="c-seg" role="group" aria-labelledby="level-label">
                  @for (option of levels; track option.level) {
                    <button type="button" [attr.aria-pressed]="level === option.level" (click)="level = option.level">{{ option.label }}</button>
                  }
                </div>
                <p class="c-hint">{{ levelNote() }}</p>
              </div>
              <div><button type="submit" class="c-btn c-btn-primary" [disabled]="busy()">Add rule</button></div>
            </form>
          </section>

          <section class="c-card" aria-labelledby="try-heading">
            <div class="c-card-head"><h2 id="try-heading">Try a text</h2></div>
            <label class="c-label" for="try">Text</label>
            <textarea id="try" class="c-input try" rows="4" [(ngModel)]="sample" placeholder="Paste release notes or a sentence"></textarea>
            <div class="try-actions"><button type="button" class="c-btn" (click)="tryText()">Check</button></div>
            @if (tried(); as found) {
              @if (found.length) {
                <app-finding-list [findings]="found"></app-finding-list>
              } @else {
                <p class="c-muted">Nothing found.</p>
              }
            }
          </section>
        </div>

        <section class="c-card c-card-flush" aria-labelledby="rules-heading">
          <div class="c-card-head pad"><h2 id="rules-heading">Your rules</h2></div>
          @if (rules(); as list) {
            @if (list.length) {
              <div class="c-table-wrap">
                <table class="c-table">
                  <thead>
                    <tr>
                      <th scope="col">Word</th>
                      <th scope="col">Effect</th>
                      <th scope="col">Added</th>
                      <th scope="col"><span class="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rule of list; track rule.id) {
                      <tr>
                        <td class="mono">{{ rule.term }}</td>
                        <td><span class="effect" [attr.data-level]="rule.level">{{ labelOf(rule.level) }}</span></td>
                        <td class="c-muted">{{ rule.createdAt | date: 'MMM d, y' }}{{ rule.createdBy ? ' by ' + rule.createdBy : '' }}</td>
                        <td class="actions">
                          <button type="button" class="c-btn c-btn-sm c-btn-danger" (click)="remove(rule)"
                                  [attr.aria-label]="'Remove the rule for ' + rule.term">
                            <lucide-icon [img]="icons.Trash2" [size]="15" aria-hidden="true"></lucide-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="c-empty">No own rules yet. The built-in lists apply.</p>
            }
          } @else {
            <div class="c-skeleton c-list-skeleton"></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .how {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13.5px;
    }

    .top {
      align-items: start;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form .c-hint {
      margin: 6px 0 0;
    }

    .try {
      height: auto;
      padding: 8px 12px;
      resize: vertical;
    }

    .try-actions {
      margin: 10px 0 14px;
    }

    .pad {
      padding: 16px 16px 0;
    }

    .effect {
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--warn-soft);
      color: var(--warn);
      font-size: 12px;
      font-weight: 600;
    }

    .effect[data-level="BLOCK"] {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .effect[data-level="ALLOW"] {
      background: var(--good-soft);
      color: var(--good);
    }

    .actions {
      text-align: right;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `
})
export class ContentRulesPage {
  private readonly reviews = inject(ReviewService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly icons = {Trash2};
  protected readonly levels = RULE_LEVELS;
  protected readonly rules = signal<ContentRule[] | null>(null);
  protected readonly builtIn = signal<Record<string, number> | null>(null);
  protected readonly tried = signal<ContentFinding[] | null>(null);
  protected readonly busy = signal(false);
  protected term = '';
  protected level: ContentRule['level'] = 'BLOCK';
  protected sample = '';

  constructor() {
    this.load();
  }

  protected levelNote() {
    return RULE_LEVELS.find(option => option.level === this.level)!.note;
  }

  protected labelOf(level: ContentRule['level']) {
    return RULE_LEVELS.find(option => option.level === level)!.label;
  }

  protected add() {
    if (!this.term.trim()) {
      this.toast.error('Enter a word or phrase.');
      return;
    }
    this.busy.set(true);
    this.reviews.saveRule(this.term, this.level).subscribe({
      next: rule => {
        this.busy.set(false);
        this.toast.success(`“${rule.term}” is ${this.labelOf(rule.level).toLowerCase()} now.`);
        this.term = '';
        this.load();
        if (this.sample.trim()) this.tryText();
      },
      error: () => this.busy.set(false),
    });
  }

  protected async remove(rule: ContentRule) {
    if (!await this.confirm.ask({
      title: `Remove the rule for “${rule.term}”?`,
      message: 'The built-in lists apply to it again.',
      confirmLabel: 'Remove rule', danger: true,
    })) return;
    this.reviews.deleteRule(rule.id).subscribe(() => {
      this.toast.success('Rule removed.');
      this.load();
    });
  }

  protected tryText() {
    this.reviews.check(this.sample).subscribe(found => this.tried.set(found));
  }

  private load() {
    this.reviews.rules().subscribe(result => {
      this.rules.set(result.rules);
      this.builtIn.set(result.builtIn);
    });
  }
}
