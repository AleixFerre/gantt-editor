import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GROUP_COLORS } from './group-form.component.model';
import { TaskService } from '../task.service';

@Component({
  selector: 'app-group-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-form.component.html',
  styleUrl: './group-form.component.scss',
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
