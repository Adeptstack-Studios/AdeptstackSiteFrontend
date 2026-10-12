import {Component, input} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MarkdownComponent} from 'ngx-markdown';

/** Markdown on the left, the rendered preview on the right; one above the other on narrow screens. */
@Component({
  selector: 'app-markdown-editor',
  imports: [ReactiveFormsModule, MarkdownComponent],
  template: `
    <div class="split">
      <label class="sr-only" [for]="inputId()">{{ label() }}</label>
      <textarea [id]="inputId()" class="source" [formControl]="control()" spellcheck="true"
                [placeholder]="placeholder()"></textarea>
      <div class="preview" aria-label="Preview">
        <span class="preview-label">Preview</span>
        <markdown [data]="control().value"></markdown>
      </div>
    </div>
  `,
  styles: `
    .split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-height: var(--editor-height, 380px);
    }

    .source {
      min-height: var(--editor-height, 380px);
      padding: 18px 20px;
      border: none;
      border-right: 1px solid var(--line);
      background: transparent;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.7;
      resize: vertical;
      outline: none;
    }

    .source:focus {
      background: var(--panel-2);
    }

    .preview {
      padding: 18px 20px;
      overflow-wrap: anywhere;
    }

    .preview-label {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .preview ::ng-deep h2 {
      margin: 14px 0 6px;
      font-size: 17px;
    }

    .preview ::ng-deep ul {
      margin: 0;
      padding-left: 20px;
    }

    .preview ::ng-deep img {
      max-width: 100%;
      border-radius: var(--radius-sm);
    }

    @media (max-width: 1100px) {
      .split {
        grid-template-columns: minmax(0, 1fr);
      }

      .source {
        border-right: none;
        border-bottom: 1px solid var(--line);
      }
    }
  `
})
export class MarkdownEditor {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input('content');
  readonly label = input('Text in Markdown');
  readonly placeholder = input('');
}
