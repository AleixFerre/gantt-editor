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
  templateUrl: './task-edit-dialog.component.html',
  styleUrl: './task-edit-dialog.component.scss',
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
