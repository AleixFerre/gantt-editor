import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GanttApiService } from '../gantt/gantt-api.service';
import { ApiBoard } from '../gantt/gantt-api.service.model';

@Component({
  selector: 'app-boards-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boards-list.component.html',
  styleUrl: './boards-list.component.scss',
})
export class BoardsListComponent implements OnInit {
  private readonly api = inject(GanttApiService);
  private readonly router = inject(Router);

  protected readonly boards = signal<ApiBoard[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);

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
}
