import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GanttApiService } from '../gantt/gantt-api.service';
import { ApiBoard } from '../gantt/gantt-api.service.model';

@Component({
  selector: 'app-boards-list',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boards-list.component.html',
  styleUrl: './boards-list.component.scss',
})
export class BoardsListComponent implements OnInit {
  private readonly api = inject(GanttApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly boards = signal<ApiBoard[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly creating = signal(false);
  protected readonly creatingError = signal<string | null>(null);
  protected readonly pendingNames = signal<readonly string[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
  });

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.creating()) {
        this.form.reset({ name: '' });
        this.creatingError.set(null);
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const boards = await this.api.listBoards();
      this.boards.set(boards);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load boards.');
    } finally {
      this.loaded.set(true);
    }
  }

  protected open(board: ApiBoard): void {
    void this.router.navigate(['/app/board', board.id]);
  }

  protected openCreate(): void {
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected async submitCreate(): Promise<void> {
    if (this.form.invalid) return;
    const name = this.form.getRawValue().name.trim();
    if (!name) return;
    this.creatingError.set(null);
    this.creating.set(false);
    this.pendingNames.update((list) => [...list, name]);
    try {
      const board = await this.api.createBoard(name);
      this.boards.update((list) => [...list, board]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create board.');
    } finally {
      this.pendingNames.update((list) => {
        const idx = list.indexOf(name);
        if (idx === -1) return list;
        const next = [...list];
        next.splice(idx, 1);
        return next;
      });
    }
  }
}
