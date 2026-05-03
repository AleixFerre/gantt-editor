import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { GanttApiService } from '../gantt/gantt-api.service';
import { ApiBoard } from '../gantt/gantt-api.service.model';

@Component({
  selector: 'app-boards-list',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
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
  protected readonly editingBoard = signal<ApiBoard | null>(null);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly dialogOpen = computed(() => this.creating() || this.editingBoard() !== null);
  protected readonly dialogMode = computed<'create' | 'edit'>(() =>
    this.editingBoard() ? 'edit' : 'create',
  );
  protected readonly dialogTitle = computed(() =>
    this.dialogMode() === 'edit' ? 'Rename board' : 'New board',
  );
  protected readonly dialogSubmitLabel = computed(() =>
    this.dialogMode() === 'edit' ? 'Save' : 'Create',
  );

  protected readonly pendingNames = signal<readonly string[]>([]);
  protected readonly removingIds = signal<readonly number[]>([]);
  protected readonly pendingDelete = signal<ApiBoard | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
  });

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const isOpen = this.dialogOpen();
      if (isOpen) {
        const editing = this.editingBoard();
        this.form.reset({ name: editing?.name ?? '' });
        this.dialogError.set(null);
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
    if (this.removingIds().includes(board.id)) return;
    void this.router.navigate(['/app/board', board.id]);
  }

  protected isRemoving(boardId: number): boolean {
    return this.removingIds().includes(boardId);
  }

  protected openCreate(): void {
    this.editingBoard.set(null);
    this.creating.set(true);
  }

  protected openEdit(event: Event, board: ApiBoard): void {
    event.stopPropagation();
    this.creating.set(false);
    this.editingBoard.set(board);
  }

  protected closeDialog(): void {
    this.creating.set(false);
    this.editingBoard.set(null);
  }

  protected async submitDialog(): Promise<void> {
    if (this.form.invalid) return;
    const name = this.form.getRawValue().name.trim();
    if (!name) return;
    if (this.dialogMode() === 'edit') {
      const target = this.editingBoard();
      if (!target) return;
      this.dialogError.set(null);
      try {
        const updated = await this.api.updateBoard(target.id, name);
        this.boards.update((list) =>
          list.map((b) => (b.id === target.id ? updated : b)),
        );
        this.editingBoard.set(null);
      } catch (err) {
        this.dialogError.set(err instanceof Error ? err.message : 'Failed to rename board.');
      }
      return;
    }

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

  protected openDelete(event: Event, board: ApiBoard): void {
    event.stopPropagation();
    this.pendingDelete.set(board);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const board = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!board) return;
    this.removingIds.update((list) => [...list, board.id]);
    try {
      await this.api.deleteBoard(board.id);
      this.boards.update((list) => list.filter((b) => b.id !== board.id));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete board.');
    } finally {
      this.removingIds.update((list) => list.filter((id) => id !== board.id));
    }
  }

  protected readonly pendingDeleteMessage = computed(() => {
    const board = this.pendingDelete();
    if (!board) return '';
    return `Delete the board “${board.name}”? This permanently removes its groups and tasks.`;
  });
}
