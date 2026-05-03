import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GroupBarComponent } from './group-bar/group-bar';
import { GroupFormComponent } from './group-form/group-form';
import { TaskBarComponent } from './task-bar/task-bar';
import {
  TaskEdit,
  TaskEditDialogComponent,
} from './task-edit-dialog/task-edit-dialog';
import { TaskFormComponent } from './task-form/task-form';
import { GanttRow, Task } from './task.model';
import { TaskService } from './task.service';
import { TimelineHeaderComponent } from './timeline-header/timeline-header';

const DAY_WIDTH_PX = 40;
const ROW_HEIGHT_PX = 44;

type DropTarget =
  | { readonly kind: 'task'; readonly id: string; readonly position: 'above' | 'below' }
  | { readonly kind: 'group'; readonly id: string };

@Component({
  selector: 'app-gantt',
  imports: [
    TaskFormComponent,
    GroupFormComponent,
    TimelineHeaderComponent,
    TaskBarComponent,
    GroupBarComponent,
    TaskEditDialogComponent,
  ],
  templateUrl: './gantt.html',
  styleUrl: './gantt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttComponent {
  private readonly taskService = inject(TaskService);

  protected readonly dayWidth = DAY_WIDTH_PX;
  protected readonly rowHeight = ROW_HEIGHT_PX;
  protected readonly rows = this.taskService.rows;
  protected readonly groups = this.taskService.groups;
  protected readonly totalDays = this.taskService.totalDays;
  protected readonly chartWidth = computed(() => this.totalDays() * this.dayWidth);
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly editingTask = computed<Task | null>(() => {
    const id = this.editingTaskId();
    if (!id) return null;
    return this.taskService.tasks().find((task) => task.id === id) ?? null;
  });

  protected onTaskMove(id: string, startDay: number): void {
    this.taskService.updateStartDay(id, startDay);
  }

  protected onTaskResize(id: string, duration: number): void {
    this.taskService.updateDuration(id, duration);
  }

  protected onTaskRemove(id: string): void {
    this.taskService.removeTask(id);
  }

  protected readonly draggingTaskId = signal<string | null>(null);
  protected readonly dropTarget = signal<DropTarget | null>(null);

  protected onTaskDragStart(event: DragEvent, id: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    this.draggingTaskId.set(id);
  }

  protected onTaskDragEnd(): void {
    this.draggingTaskId.set(null);
    this.dropTarget.set(null);
  }

  protected onTaskDragOver(event: DragEvent, id: string): void {
    const draggingId = this.draggingTaskId();
    if (!draggingId || draggingId === id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const position: 'above' | 'below' =
      event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    const current = this.dropTarget();
    if (
      !current ||
      current.kind !== 'task' ||
      current.id !== id ||
      current.position !== position
    ) {
      this.dropTarget.set({ kind: 'task', id, position });
    }
  }

  protected onTaskDrop(event: DragEvent, id: string): void {
    const draggingId = this.draggingTaskId();
    if (!draggingId || draggingId === id) return;
    event.preventDefault();
    const target = this.dropTarget();
    const position =
      target && target.kind === 'task' && target.id === id ? target.position : 'above';
    this.taskService.placeTaskRelativeTo(draggingId, id, position);
    this.draggingTaskId.set(null);
    this.dropTarget.set(null);
  }

  protected onGroupDragOver(event: DragEvent, groupId: string): void {
    if (!this.draggingTaskId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const current = this.dropTarget();
    if (!current || current.kind !== 'group' || current.id !== groupId) {
      this.dropTarget.set({ kind: 'group', id: groupId });
    }
  }

  protected onGroupDrop(event: DragEvent, groupId: string): void {
    const draggingId = this.draggingTaskId();
    if (!draggingId) return;
    event.preventDefault();
    this.taskService.placeTaskInGroup(draggingId, groupId);
    this.draggingTaskId.set(null);
    this.dropTarget.set(null);
  }

  protected onDragLeaveContainer(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    const container = event.currentTarget as Node;
    if (related && container.contains(related)) return;
    this.dropTarget.set(null);
  }

  protected isTaskDropAbove(id: string): boolean {
    const target = this.dropTarget();
    return (
      !!target && target.kind === 'task' && target.id === id && target.position === 'above'
    );
  }

  protected isTaskDropBelow(id: string): boolean {
    const target = this.dropTarget();
    return (
      !!target && target.kind === 'task' && target.id === id && target.position === 'below'
    );
  }

  protected isGroupDropTarget(groupId: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'group' && target.id === groupId;
  }

  protected onGroupMove(id: string, startDay: number): void {
    this.taskService.moveGroup(id, startDay);
  }

  protected onGroupRemove(id: string): void {
    this.taskService.removeGroup(id);
  }

  protected onGroupToggle(id: string): void {
    this.taskService.toggleGroup(id);
  }

  protected startEditTask(id: string): void {
    this.editingTaskId.set(id);
  }

  protected cancelEditTask(): void {
    this.editingTaskId.set(null);
  }

  protected saveEditTask(updates: TaskEdit): void {
    const id = this.editingTaskId();
    if (!id) return;
    this.taskService.updateTask(id, updates);
    this.editingTaskId.set(null);
  }

  protected exportJson(): void {
    const data = this.taskService.exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gantt-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  protected async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      this.taskService.importState(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not read file.';
      alert(`Import failed: ${message}`);
    } finally {
      input.value = '';
    }
  }

  protected trackRow(_index: number, row: GanttRow): string {
    return row.kind === 'group' ? `g:${row.group.id}` : `t:${row.task.id}`;
  }
}
