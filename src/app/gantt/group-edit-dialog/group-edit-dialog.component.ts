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
import { Group } from '../gantt.component.model';
import { GroupEdit } from './group-edit-dialog.component.model';

@Component({
  selector: 'app-group-edit-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-edit-dialog.component.html',
  styleUrl: './group-edit-dialog.component.scss',
})
export class GroupEditDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly group = input<Group | null>(null);

  readonly saved = output<GroupEdit>();
  readonly cancelled = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    color: ['#6366f1', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const group = this.group();
      const dialog = this.dialogRef().nativeElement;
      if (group) {
        this.form.reset({ name: group.name, color: group.color });
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saved.emit({ name: value.name.trim(), color: value.color });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
