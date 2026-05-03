import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Group, Task } from '../task.model';

export interface TaskEdit {
  name: string;
  groupId: string | null;
  startDay: number;
  duration: number;
  color: string;
}

@Component({
  selector: 'app-task-edit-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="edit-dialog" (close)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="edit-dialog__form" novalidate>
        <h2 class="edit-dialog__title">Edit task</h2>

        <label class="edit-dialog__field">
          <span class="edit-dialog__label">Name</span>
          <input type="text" formControlName="name" autocomplete="off" />
        </label>

        <label class="edit-dialog__field">
          <span class="edit-dialog__label">Group</span>
          <select formControlName="groupId">
            <option [ngValue]="null">— No group —</option>
            @for (group of groups(); track group.id) {
              <option [ngValue]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>

        <div class="edit-dialog__row">
          <label class="edit-dialog__field">
            <span class="edit-dialog__label">Start day</span>
            <input type="number" min="0" formControlName="startDay" />
          </label>
          <label class="edit-dialog__field">
            <span class="edit-dialog__label">Duration</span>
            <input type="number" min="1" formControlName="duration" />
          </label>
        </div>

        <label class="edit-dialog__field">
          <span class="edit-dialog__label">Color</span>
          <input type="color" formControlName="color" aria-label="Task color" />
        </label>

        <div class="edit-dialog__actions">
          <button type="button" class="edit-dialog__btn" (click)="cancel()">Cancel</button>
          <button
            type="submit"
            class="edit-dialog__btn edit-dialog__btn--primary"
            [disabled]="form.invalid"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    :host {
      display: contents;
    }
    .edit-dialog {
      border: none;
      border-radius: 10px;
      padding: 0;
      width: min(420px, 92vw);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    }
    .edit-dialog::backdrop {
      background: rgba(15, 23, 42, 0.45);
    }
    .edit-dialog__form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
    }
    .edit-dialog__title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }
    .edit-dialog__field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .edit-dialog__row {
      display: flex;
      gap: 12px;
    }
    .edit-dialog__row .edit-dialog__field {
      flex: 1;
    }
    .edit-dialog__label {
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
    input[type='color'] {
      width: 56px;
      height: 36px;
      padding: 2px;
      cursor: pointer;
    }
    input:focus-visible,
    select:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
      border-color: #4f46e5;
    }
    .edit-dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
    .edit-dialog__btn {
      padding: 8px 14px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .edit-dialog__btn:hover {
      background: #f3f4f6;
    }
    .edit-dialog__btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
    }
    .edit-dialog__btn--primary {
      background: #4f46e5;
      color: #fff;
      border-color: #4f46e5;
    }
    .edit-dialog__btn--primary:hover:not(:disabled) {
      background: #4338ca;
    }
    .edit-dialog__btn--primary:disabled {
      background: #c7d2fe;
      border-color: #c7d2fe;
      cursor: not-allowed;
    }
  `,
})
export class TaskEditDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly task = input<Task | null>(null);
  readonly groups = input.required<readonly Group[]>();

  readonly saved = output<TaskEdit>();
  readonly cancelled = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    groupId: this.fb.control<string | null>(null),
    startDay: [0, [Validators.required, Validators.min(0)]],
    duration: [1, [Validators.required, Validators.min(1)]],
    color: ['#4f46e5', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const task = this.task();
      const dialog = this.dialogRef().nativeElement;
      if (task) {
        this.form.reset({
          name: task.name,
          groupId: task.groupId,
          startDay: task.startDay,
          duration: task.duration,
          color: task.color,
        });
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saved.emit({
      name: value.name.trim(),
      groupId: value.groupId,
      startDay: value.startDay,
      duration: value.duration,
      color: value.color,
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
