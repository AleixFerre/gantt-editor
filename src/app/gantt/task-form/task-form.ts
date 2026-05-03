import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../task.service';

const TASK_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#16a34a',
  '#ea580c',
  '#db2777',
  '#0d9488',
  '#ca8a04',
  '#7c3aed',
];

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="task-form" novalidate>
      <label class="task-form__field task-form__field--grow">
        <span class="task-form__label">Name</span>
        <input
          type="text"
          formControlName="name"
          placeholder="e.g. Research phase"
          autocomplete="off"
        />
      </label>
      <label class="task-form__field">
        <span class="task-form__label">Group</span>
        <select formControlName="groupId">
          <option [ngValue]="null">— No group —</option>
          @for (group of groups(); track group.id) {
            <option [ngValue]="group.id">{{ group.name }}</option>
          }
        </select>
      </label>
      <label class="task-form__field">
        <span class="task-form__label">Start day</span>
        <input type="number" min="0" formControlName="startDay" />
      </label>
      <label class="task-form__field">
        <span class="task-form__label">Duration (days)</span>
        <input type="number" min="1" formControlName="duration" />
      </label>
      <button type="submit" class="task-form__submit" [disabled]="form.invalid">
        Add task
      </button>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    .task-form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .task-form__field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;
    }
    .task-form__field--grow {
      flex: 1 1 200px;
    }
    .task-form__label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    input,
    select {
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: #fff;
    }
    input:focus-visible,
    select:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
      border-color: #4f46e5;
    }
    .task-form__submit {
      padding: 9px 18px;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }
    .task-form__submit:hover:not(:disabled) {
      background: #4338ca;
    }
    .task-form__submit:focus-visible {
      outline: 2px solid #fbbf24;
      outline-offset: 2px;
    }
    .task-form__submit:disabled {
      background: #c7d2fe;
      cursor: not-allowed;
    }
  `,
})
export class TaskFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly taskService = inject(TaskService);

  protected readonly groups = this.taskService.groups;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    groupId: this.fb.control<string | null>(null),
    startDay: [0, [Validators.required, Validators.min(0)]],
    duration: [3, [Validators.required, Validators.min(1)]],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const color = TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)];
    this.taskService.addTask({
      name: value.name.trim(),
      groupId: value.groupId,
      startDay: value.startDay,
      duration: value.duration,
      color,
    });
    this.form.reset({
      name: '',
      groupId: value.groupId,
      startDay: value.startDay,
      duration: value.duration,
    });
  }
}
