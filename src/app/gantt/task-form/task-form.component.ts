import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TASK_COLORS } from './task-form.component.model';
import { TaskService } from '../task.service';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss',
})
export class TaskFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly taskService = inject(TaskService);

  protected readonly groups = this.taskService.groups;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    groupId: ['', [Validators.required]],
    startDay: [0, [Validators.required, Validators.min(0)]],
    duration: [3, [Validators.required, Validators.min(1)]],
    color: [pickRandomColor(), [Validators.required]],
  });

  constructor() {
    effect(() => {
      const groups = this.groups();
      if (groups.length === 0) return;
      const current = this.form.controls.groupId.value;
      if (!current || !groups.some((g) => g.id === current)) {
        this.form.controls.groupId.setValue(groups[0].id);
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.taskService.addTask({
      name: value.name.trim(),
      groupId: value.groupId,
      startDay: value.startDay,
      duration: value.duration,
      color: value.color,
    });
    this.form.reset({
      name: '',
      groupId: value.groupId,
      startDay: value.startDay,
      duration: value.duration,
      color: pickRandomColor(),
    });
  }

  protected randomizeColor(): void {
    this.form.controls.color.setValue(pickRandomColor());
  }
}

function pickRandomColor(): string {
  return TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)];
}
