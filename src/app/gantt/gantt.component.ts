import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DAY_WIDTH_PX, GanttRow, ROW_HEIGHT_PX, Task, TaskEdit } from '../models';
import { GanttEmptyComponent } from './gantt-empty/gantt-empty.component';
import { GroupBarComponent } from './group-bar/group-bar.component';
import { GroupFormComponent } from './group-form/group-form.component';
import { TaskBarComponent } from './task-bar/task-bar.component';
import { TaskEditDialogComponent } from './task-edit-dialog/task-edit-dialog.component';
import { TaskFormComponent } from './task-form/task-form.component';
import { TaskService } from './task.service';
import { TimelineHeaderComponent } from './timeline-header/timeline-header.component';

type DragSource =
  | { readonly kind: 'task'; readonly id: string }
  | { readonly kind: 'group'; readonly id: string };

type DropTarget =
  | { readonly kind: 'task'; readonly id: string; readonly position: 'above' | 'below' }
  | {
      readonly kind: 'group';
      readonly id: string;
      readonly mode: 'into' | 'above' | 'below';
    };

@Component({
  selector: 'app-gantt',
  imports: [
    TaskFormComponent,
    GroupFormComponent,
    TimelineHeaderComponent,
    TaskBarComponent,
    GroupBarComponent,
    TaskEditDialogComponent,
    GanttEmptyComponent,
  ],
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  protected readonly dayWidth = DAY_WIDTH_PX;
  protected readonly rowHeight = ROW_HEIGHT_PX;
  protected readonly rows = this.taskService.rows;
  protected readonly groups = this.taskService.groups;
  protected readonly totalDays = this.taskService.totalDays;
  protected readonly loaded = this.taskService.loaded;
  protected readonly loadError = this.taskService.loadError;
  protected readonly isEmpty = computed(() => this.loaded() && this.groups().length === 0);
  protected readonly chartWidth = computed(() => this.totalDays() * this.dayWidth);

  ngOnInit(): void {
    void this.taskService.load();
  }
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

  protected onTaskCommit(id: string): void {
    void this.taskService.persistTaskBounds(id);
  }

  protected onGroupCommit(id: string): void {
    void this.taskService.persistGroupTaskBounds(id);
  }

  protected onTaskRemove(id: string): void {
    this.taskService.removeTask(id);
  }

  protected readonly dragging = signal<DragSource | null>(null);
  protected readonly dropTarget = signal<DropTarget | null>(null);

  protected onTaskDragStart(event: DragEvent, id: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `task:${id}`);
    this.dragging.set({ kind: 'task', id });
  }

  protected onGroupDragStart(event: DragEvent, id: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `group:${id}`);
    this.dragging.set({ kind: 'group', id });
  }

  protected onDragEnd(): void {
    this.dragging.set(null);
    this.dropTarget.set(null);
  }

  protected onTaskDragOver(event: DragEvent, id: string): void {
    const drag = this.dragging();
    if (!drag || drag.kind !== 'task' || drag.id === id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const position: 'above' | 'below' =
      event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    const current = this.dropTarget();
    if (!current || current.kind !== 'task' || current.id !== id || current.position !== position) {
      this.dropTarget.set({ kind: 'task', id, position });
    }
  }

  protected onTaskDrop(event: DragEvent, id: string): void {
    const drag = this.dragging();
    if (!drag || drag.kind !== 'task' || drag.id === id) return;
    event.preventDefault();
    const target = this.dropTarget();
    const position =
      target && target.kind === 'task' && target.id === id ? target.position : 'above';
    this.taskService.placeTaskRelativeTo(drag.id, id, position);
    this.onDragEnd();
  }

  protected onGroupDragOver(event: DragEvent, groupId: string): void {
    const drag = this.dragging();
    if (!drag) return;
    if (drag.kind === 'group' && drag.id === groupId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    let mode: 'into' | 'above' | 'below' = 'into';
    if (drag.kind === 'group') {
      const row = event.currentTarget as HTMLElement;
      const rect = row.getBoundingClientRect();
      mode = event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    }
    const current = this.dropTarget();
    if (!current || current.kind !== 'group' || current.id !== groupId || current.mode !== mode) {
      this.dropTarget.set({ kind: 'group', id: groupId, mode });
    }
  }

  protected onGroupDrop(event: DragEvent, groupId: string): void {
    const drag = this.dragging();
    if (!drag) return;
    event.preventDefault();
    if (drag.kind === 'task') {
      this.taskService.placeTaskInGroup(drag.id, groupId);
    } else if (drag.id !== groupId) {
      const target = this.dropTarget();
      const position: 'above' | 'below' =
        target && target.kind === 'group' && target.id === groupId && target.mode !== 'into'
          ? target.mode
          : 'above';
      this.taskService.placeGroupRelativeTo(drag.id, groupId, position);
    }
    this.onDragEnd();
  }

  protected isTaskDropAbove(id: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'task' && target.id === id && target.position === 'above';
  }

  protected isTaskDropBelow(id: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'task' && target.id === id && target.position === 'below';
  }

  protected isGroupDropInto(groupId: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'group' && target.id === groupId && target.mode === 'into';
  }

  protected isGroupDropAbove(groupId: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'group' && target.id === groupId && target.mode === 'above';
  }

  protected isGroupDropBelow(groupId: string): boolean {
    const target = this.dropTarget();
    return !!target && target.kind === 'group' && target.id === groupId && target.mode === 'below';
  }

  protected isTaskDragging(id: string): boolean {
    const drag = this.dragging();
    return !!drag && drag.kind === 'task' && drag.id === id;
  }

  protected isGroupDragging(id: string): boolean {
    const drag = this.dragging();
    return !!drag && drag.kind === 'group' && drag.id === id;
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
      const message = error instanceof Error ? error.message : 'Could not read file.';
      alert(`Import failed: ${message}`);
    } finally {
      input.value = '';
    }
  }

  protected trackRow(_index: number, row: GanttRow): string {
    return row.kind === 'group' ? `g:${row.group.id}` : `t:${row.task.id}`;
  }
}
