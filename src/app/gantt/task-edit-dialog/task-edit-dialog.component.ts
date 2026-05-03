import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Group, Task } from '../gantt.component.model';
import { TaskEdit } from './task-edit-dialog.component.model';

@Component({
  selector: 'app-task-edit-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-edit-dialog.component.html',
  styleUrl: './task-edit-dialog.component.scss',
})
export class TaskEditDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input<boolean>(false);
  readonly task = input<Task | null>(null);
  readonly groups = input.required<readonly Group[]>();
  readonly lockedGroupId = input<string | null>(null);

  readonly saved = output<TaskEdit>();
  readonly cancelled = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly title = computed(() => (this.task() ? 'Edit task' : 'New task'));
  protected readonly submitLabel = computed(() => (this.task() ? 'Save' : 'Create'));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    groupId: this.fb.control<string | null>(null),
    startDay: [0, [Validators.required, Validators.min(0)]],
    duration: [1, [Validators.required, Validators.min(1)]],
    color: ['#4f46e5', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const task = this.task();
      const locked = this.lockedGroupId();
      const dialog = this.dialogRef().nativeElement;
      if (isOpen) {
        this.form.reset({
          name: task?.name ?? '',
          groupId: task?.groupId ?? locked ?? null,
          startDay: task?.startDay ?? 0,
          duration: task?.duration ?? 1,
          color: task?.color ?? '#4f46e5',
        });
        if (locked !== null) {
          this.form.controls.groupId.disable();
        } else {
          this.form.controls.groupId.enable();
        }
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
