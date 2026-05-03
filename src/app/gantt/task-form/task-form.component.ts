import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TASK_COLORS } from '../../models';
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
    groupId: this.fb.control<string | null>(null),
    startDay: [0, [Validators.required, Validators.min(0)]],
    duration: [3, [Validators.required, Validators.min(1)]],
    color: [pickRandomColor(), [Validators.required]],
  });

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
