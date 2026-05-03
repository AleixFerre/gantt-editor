import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../task.service';

const GROUP_COLORS = [
  '#6366f1',
  '#0d9488',
  '#db2777',
  '#7c3aed',
  '#ca8a04',
  '#dc2626',
  '#0284c7',
];

@Component({
  selector: 'app-group-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="group-form" novalidate>
      <label class="group-form__field">
        <span class="group-form__label">New group</span>
        <input
          type="text"
          formControlName="name"
          placeholder="e.g. Phase 1"
          autocomplete="off"
        />
      </label>
      <button type="submit" class="group-form__submit" [disabled]="form.invalid">
        + Add group
      </button>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    .group-form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
      padding: 12px 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .group-form__field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 240px;
    }
    .group-form__label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    input {
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: #fff;
    }
    input:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
      border-color: #4f46e5;
    }
    .group-form__submit {
      padding: 9px 14px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .group-form__submit:hover:not(:disabled) {
      background: #f3f4f6;
    }
    .group-form__submit:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
    }
    .group-form__submit:disabled {
      color: #9ca3af;
      cursor: not-allowed;
    }
  `,
})
export class GroupFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly taskService = inject(TaskService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    const { name } = this.form.getRawValue();
    const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
    this.taskService.addGroup({ name: name.trim(), color });
    this.form.reset({ name: '' });
  }
}
