import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DAY_WIDTH_PX, GanttRow, Group, ROW_HEIGHT_PX, Task } from './gantt.component.model';
import { TaskEdit } from './task-edit-dialog/task-edit-dialog.component.model';
import { GroupEdit } from './group-edit-dialog/group-edit-dialog.component.model';
import { GanttEmptyComponent } from './gantt-empty/gantt-empty.component';
import { GroupBarComponent } from './group-bar/group-bar.component';
import { GroupEditDialogComponent } from './group-edit-dialog/group-edit-dialog.component';
import { TaskBarComponent } from './task-bar/task-bar.component';
import { TaskEditDialogComponent } from './task-edit-dialog/task-edit-dialog.component';
import { TaskService } from './task.service';
import { TimelineHeaderComponent } from './timeline-header/timeline-header.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';

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
    TimelineHeaderComponent,
    TaskBarComponent,
    GroupBarComponent,
    TaskEditDialogComponent,
    GroupEditDialogComponent,
    GanttEmptyComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttComponent implements OnInit, OnDestroy {
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

  private readonly labelWidthStorageKey = 'gantt:labelWidth';
  protected readonly labelWidth = signal(this.readStoredLabelWidth(240));
  protected readonly resizing = signal(false);
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private readonly resizeMove = (event: PointerEvent) => this.onResizeMove(event);
  private readonly resizeEnd = () => this.onResizeEnd();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detachResize());
    effect(() => {
      const value = this.labelWidth();
      try {
        localStorage.setItem(this.labelWidthStorageKey, String(value));
      } catch {
        // ignore storage failures (private mode, quota)
      }
    });
  }

  private readStoredLabelWidth(fallback: number): number {
    try {
      const raw = localStorage.getItem(this.labelWidthStorageKey);
      if (!raw) return fallback;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.max(140, Math.min(640, parsed));
    } catch {
      return fallback;
    }
  }

  protected onResizeStart(event: PointerEvent): void {
    event.preventDefault();
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.labelWidth();
    this.resizing.set(true);
    window.addEventListener('pointermove', this.resizeMove);
    window.addEventListener('pointerup', this.resizeEnd);
    window.addEventListener('pointercancel', this.resizeEnd);
  }

  private onResizeMove(event: PointerEvent): void {
    const delta = event.clientX - this.resizeStartX;
    const next = Math.max(140, Math.min(640, this.resizeStartWidth + delta));
    this.labelWidth.set(next);
  }

  private onResizeEnd(): void {
    this.detachResize();
    this.resizing.set(false);
  }

  private detachResize(): void {
    window.removeEventListener('pointermove', this.resizeMove);
    window.removeEventListener('pointerup', this.resizeEnd);
    window.removeEventListener('pointercancel', this.resizeEnd);
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const boardId = raw ? Number(raw) : NaN;
    if (!Number.isFinite(boardId)) {
      void this.router.navigate(['/app']);
      return;
    }
    void this.taskService.load(boardId);
  }

  ngOnDestroy(): void {
    this.taskService.detachBoard();
  }

  protected goToBoards(): void {
    void this.router.navigate(['/app']);
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

  protected onTaskCommit(id: string, change: 'move' | 'resize'): void {
    void this.taskService.persistTaskBounds(id, change);
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

  protected isAnyGroupDragging(): boolean {
    const drag = this.dragging();
    return !!drag && drag.kind === 'group';
  }

  protected onGroupMove(id: string, startDay: number): void {
    this.taskService.moveGroup(id, startDay);
  }

  protected readonly pendingGroupRemovalId = signal<string | null>(null);
  protected readonly pendingGroupRemoval = computed<Group | null>(() => {
    const id = this.pendingGroupRemovalId();
    if (!id) return null;
    return this.taskService.groups().find((g) => g.id === id) ?? null;
  });
  protected readonly pendingGroupRemovalMessage = computed<string>(() => {
    const group = this.pendingGroupRemoval();
    if (!group) return '';
    const taskCount = this.taskService.tasks().filter((t) => t.groupId === group.id).length;
    if (taskCount === 0) {
      return `Delete the group “${group.name}”?`;
    }
    const noun = taskCount === 1 ? 'task' : 'tasks';
    return `Delete the group “${group.name}” and its ${taskCount} ${noun}? This cannot be undone.`;
  });

  protected onGroupRemove(id: string): void {
    this.pendingGroupRemovalId.set(id);
  }

  protected confirmGroupRemoval(): void {
    const id = this.pendingGroupRemovalId();
    if (!id) return;
    this.pendingGroupRemovalId.set(null);
    void this.taskService.removeGroup(id);
  }

  protected cancelGroupRemoval(): void {
    this.pendingGroupRemovalId.set(null);
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
    void this.taskService.updateTask(id, updates);
    this.editingTaskId.set(null);
  }

  protected readonly editingGroupId = signal<string | null>(null);
  protected readonly editingGroup = computed<Group | null>(() => {
    const id = this.editingGroupId();
    if (!id) return null;
    return this.taskService.groups().find((group) => group.id === id) ?? null;
  });

  protected startEditGroup(id: string): void {
    this.editingGroupId.set(id);
  }

  protected cancelEditGroup(): void {
    this.editingGroupId.set(null);
  }

  protected saveEditGroup(updates: GroupEdit): void {
    const id = this.editingGroupId();
    if (!id) return;
    void this.taskService.updateGroup(id, updates);
    this.editingGroupId.set(null);
  }

  protected readonly creatingGroup = signal(false);
  protected readonly creatingTaskGroupId = signal<string | null>(null);

  protected openCreateGroup(): void {
    this.creatingGroup.set(true);
  }

  protected cancelCreateGroup(): void {
    this.creatingGroup.set(false);
  }

  protected saveCreateGroup(updates: GroupEdit): void {
    this.creatingGroup.set(false);
    void this.taskService.addGroup({ name: updates.name, color: updates.color });
  }

  protected openCreateTaskInGroup(groupId: string): void {
    this.creatingTaskGroupId.set(groupId);
  }

  protected cancelCreateTask(): void {
    this.creatingTaskGroupId.set(null);
  }

  protected saveCreateTask(updates: TaskEdit): void {
    const groupId = this.creatingTaskGroupId();
    this.creatingTaskGroupId.set(null);
    if (!groupId) return;
    void this.taskService.addTask({
      name: updates.name,
      color: updates.color,
      startDay: updates.startDay,
      duration: updates.duration,
      groupId,
    });
  }

  protected trackRow(_index: number, row: GanttRow): string {
    return row.kind === 'group' ? `g:${row.group.id}` : `t:${row.task.id}`;
  }
}
