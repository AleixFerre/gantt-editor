import { Injectable, computed, inject, signal } from '@angular/core';
import { GanttRow, Group, GroupSpan, Task } from './gantt.component.model';
import { ApiGroup, ReorderBody } from './gantt-api.service.model';
import {
  EXPORT_VERSION,
  GanttExport,
  MIN_VISIBLE_DAYS,
  TRAILING_PADDING_DAYS,
} from './task.service.model';
import { ToastService } from '../shared/toast.service';
import { GanttApiService } from './gantt-api.service';

export type TaskBoundsChange = 'move' | 'resize';

const groupKey = (id: number) => `g-${id}`;
const taskKey = (id: number) => `t-${id}`;
const describe = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
const parseGroupId = (key: string): number | null => {
  const match = /^g-(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
};
const parseTaskId = (key: string): number | null => {
  const match = /^t-(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
};

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(GanttApiService);
  private readonly toast = inject(ToastService);

  private readonly _groups = signal<Group[]>([]);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _loaded = signal(false);
  private readonly _loadError = signal<string | null>(null);
  private boardId: number | null = null;

  readonly tasks = this._tasks.asReadonly();
  readonly groups = this._groups.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loadError = this._loadError.asReadonly();

  readonly totalDays = computed(() => {
    const lastDay = this._tasks().reduce(
      (acc, task) => Math.max(acc, task.startDay + task.duration),
      0,
    );
    return Math.max(MIN_VISIBLE_DAYS, lastDay + TRAILING_PADDING_DAYS);
  });

  readonly rows = computed<GanttRow[]>(() => {
    const groups = this._groups();
    const tasks = this._tasks();
    const rows: GanttRow[] = [];

    for (const group of groups) {
      const groupTasks = tasks.filter((task) => task.groupId === group.id);
      rows.push({
        kind: 'group',
        group,
        span: computeSpan(groupTasks),
        taskCount: groupTasks.length,
      });
      if (!group.collapsed) {
        for (const task of groupTasks) {
          rows.push({ kind: 'task', task, inGroup: true });
        }
      }
    }

    for (const task of tasks.filter((t) => t.groupId === null)) {
      rows.push({ kind: 'task', task, inGroup: false });
    }

    return rows;
  });

  async load(boardId: number): Promise<void> {
    this.boardId = boardId;
    this._loaded.set(false);
    try {
      const data = await this.api.listGroups(boardId);
      const { groups, tasks } = mapApiGroups(data);
      this._groups.set(groups);
      this._tasks.set(tasks);
      this._loadError.set(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load.';
      this._loadError.set(message);
      this._groups.set([]);
      this._tasks.set([]);
    } finally {
      this._loaded.set(true);
    }
  }

  async addTask(task: Omit<Task, 'id'>): Promise<void> {
    const apiGroup = task.groupId ? parseGroupId(task.groupId) : null;
    try {
      const created = await this.api.createTask({
        name: task.name,
        color: task.color,
        start: task.startDay,
        duration: task.duration,
        group: apiGroup,
      });
      this._tasks.update((tasks) => [...tasks, { ...task, id: taskKey(created.id) }]);
      this.toast.success(`Task “${task.name}” created`);
    } catch (error) {
      this.toast.error(`Could not create task: ${describe(error)}`);
    }
  }

  async addGroup(group: Omit<Group, 'id' | 'collapsed'>): Promise<string | null> {
    if (this.boardId === null) {
      this.toast.error('No board selected');
      return null;
    }
    try {
      const created = await this.api.createGroup({
        name: group.name,
        color: group.color,
        board: this.boardId,
      });
      const id = groupKey(created.id);
      this._groups.update((groups) => [
        ...groups,
        { ...group, id, collapsed: false },
      ]);
      this.toast.success(`Group “${group.name}” created`);
      return id;
    } catch (error) {
      this.toast.error(`Could not create group: ${describe(error)}`);
      return null;
    }
  }

  async persistTaskBounds(id: string, change: TaskBoundsChange): Promise<void> {
    const apiId = parseTaskId(id);
    if (apiId === null) return;
    const task = this._tasks().find((t) => t.id === id);
    if (!task) return;
    try {
      await this.api.updateTask(apiId, {
        start: task.startDay,
        duration: task.duration,
      });
      const verb = change === 'resize' ? 'resized' : 'rescheduled';
      this.toast.success(`Task “${task.name}” ${verb}`);
    } catch (error) {
      const verb = change === 'resize' ? 'resize' : 'reschedule';
      this.toast.error(`Could not ${verb} task: ${describe(error)}`);
    }
  }

  async persistGroupTaskBounds(groupId: string): Promise<void> {
    const group = this._groups().find((g) => g.id === groupId);
    const tasks = this._tasks().filter((t) => t.groupId === groupId);
    try {
      await Promise.all(
        tasks.map((task) => {
          const apiId = parseTaskId(task.id);
          if (apiId === null) return Promise.resolve();
          return this.api.updateTask(apiId, { start: task.startDay });
        }),
      );
      this.toast.success(
        group ? `Group “${group.name}” rescheduled` : 'Group rescheduled',
      );
    } catch (error) {
      this.toast.error(`Could not reschedule group: ${describe(error)}`);
    }
  }

  removeTask(id: string): void {
    this._tasks.update((tasks) => tasks.filter((task) => task.id !== id));
  }

  updateStartDay(id: string, startDay: number): void {
    this._tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, startDay: Math.max(0, startDay) } : task,
      ),
    );
  }

  updateDuration(id: string, duration: number): void {
    this._tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, duration: Math.max(1, duration) } : task,
      ),
    );
  }

  async placeTaskRelativeTo(
    draggedId: string,
    targetId: string,
    position: 'above' | 'below',
  ): Promise<void> {
    if (draggedId === targetId) return;
    const before = this._tasks().find((t) => t.id === draggedId);
    if (!before) return;
    const previousGroupId = before.groupId;
    const beforeOrders = this.snapshotTaskOrders();
    let nextGroupId: string | null = previousGroupId;
    this._tasks.update((tasks) => {
      const dragged = tasks.find((t) => t.id === draggedId);
      const target = tasks.find((t) => t.id === targetId);
      if (!dragged || !target) return tasks;
      const without = tasks.filter((t) => t.id !== draggedId);
      const targetIdx = without.findIndex((t) => t.id === targetId);
      if (targetIdx === -1) return tasks;
      const insertAt = position === 'above' ? targetIdx : targetIdx + 1;
      const updated: Task = { ...dragged, groupId: target.groupId };
      nextGroupId = target.groupId;
      const next = [...without];
      next.splice(insertAt, 0, updated);
      return next;
    });
    await this.persistOrdersFor(
      [previousGroupId, nextGroupId],
      draggedId,
      previousGroupId,
      beforeOrders,
    );
  }

  async placeGroupRelativeTo(
    draggedId: string,
    targetId: string,
    position: 'above' | 'below',
  ): Promise<void> {
    if (draggedId === targetId) return;
    const beforeIdx = new Map(this._groups().map((g, i) => [g.id, i] as const));
    let changed = false;
    this._groups.update((groups) => {
      const dragged = groups.find((g) => g.id === draggedId);
      if (!dragged) return groups;
      const without = groups.filter((g) => g.id !== draggedId);
      const targetIdx = without.findIndex((g) => g.id === targetId);
      if (targetIdx === -1) return groups;
      const insertAt = position === 'above' ? targetIdx : targetIdx + 1;
      const next = [...without];
      next.splice(insertAt, 0, dragged);
      changed = true;
      return next;
    });
    if (!changed) return;
    const updates: ReorderBody = [];
    this._groups().forEach((group, index) => {
      if (beforeIdx.get(group.id) === index) return;
      const apiId = parseGroupId(group.id);
      if (apiId !== null) updates.push({ [apiId]: index });
    });
    if (updates.length === 0) return;
    try {
      await this.api.reorderGroups(updates);
      this.toast.success('Groups reordered');
    } catch (error) {
      this.toast.error(`Could not reorder groups: ${describe(error)}`);
    }
  }

  async placeTaskInGroup(draggedId: string, groupId: string | null): Promise<void> {
    const before = this._tasks().find((t) => t.id === draggedId);
    if (!before) return;
    const previousGroupId = before.groupId;
    if (groupId !== null && !this._groups().some((g) => g.id === groupId)) return;
    const beforeOrders = this.snapshotTaskOrders();
    this._tasks.update((tasks) => {
      const dragged = tasks.find((t) => t.id === draggedId);
      if (!dragged) return tasks;
      const without = tasks.filter((t) => t.id !== draggedId);
      const updated: Task = { ...dragged, groupId };
      const firstSibling = without.findIndex((t) => t.groupId === groupId);
      const next = [...without];
      if (firstSibling === -1) {
        next.push(updated);
      } else {
        next.splice(firstSibling, 0, updated);
      }
      return next;
    });
    await this.persistOrdersFor(
      [previousGroupId, groupId],
      draggedId,
      previousGroupId,
      beforeOrders,
    );
  }

  private snapshotTaskOrders(): Map<string, number> {
    const map = new Map<string, number>();
    const byGroup = new Map<string | null, Task[]>();
    for (const task of this._tasks()) {
      const arr = byGroup.get(task.groupId) ?? [];
      arr.push(task);
      byGroup.set(task.groupId, arr);
    }
    for (const arr of byGroup.values()) {
      arr.forEach((task, index) => map.set(task.id, index));
    }
    return map;
  }

  private async persistOrdersFor(
    groupIds: ReadonlyArray<string | null>,
    draggedId: string,
    previousDraggedGroupId: string | null,
    beforeOrders: Map<string, number>,
  ): Promise<void> {
    const unique = Array.from(new Set(groupIds));
    const draggedApiId = parseTaskId(draggedId);
    const draggedTask = this._tasks().find((t) => t.id === draggedId);
    const updates: ReorderBody = [];
    for (const groupId of unique) {
      const tasksInGroup = this._tasks().filter((t) => t.groupId === groupId);
      tasksInGroup.forEach((task, index) => {
        if (beforeOrders.get(task.id) === index) return;
        const apiId = parseTaskId(task.id);
        if (apiId !== null) updates.push({ [apiId]: index });
      });
    }
    const newGroupId = draggedTask?.groupId ?? null;
    const groupChanged = newGroupId !== previousDraggedGroupId;
    const newApiGroup = newGroupId ? parseGroupId(newGroupId) : null;
    try {
      const calls: Promise<unknown>[] = [];
      if (updates.length > 0) calls.push(this.api.reorderTasks(updates));
      if (draggedApiId !== null && groupChanged) {
        calls.push(this.api.updateTask(draggedApiId, { group: newApiGroup }));
      }
      if (calls.length === 0) return;
      await Promise.all(calls);
      this.toast.success('Tasks reordered');
    } catch (error) {
      this.toast.error(`Could not reorder tasks: ${describe(error)}`);
    }
  }

  async updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<void> {
    const apiId = parseTaskId(id);
    if (apiId === null) return;
    const before = this._tasks().find((t) => t.id === id);
    if (!before) return;
    let next: Task | null = null;
    this._tasks.update((tasks) =>
      tasks.map((task) => {
        if (task.id !== id) return task;
        const merged: Task = { ...task, ...updates };
        merged.startDay = Math.max(0, Math.floor(merged.startDay));
        merged.duration = Math.max(1, Math.floor(merged.duration));
        if (merged.groupId !== null && !this._groups().some((g) => g.id === merged.groupId)) {
          merged.groupId = null;
        }
        next = merged;
        return merged;
      }),
    );
    if (!next) return;
    const after = next as Task;
    const body: Record<string, unknown> = {};
    if (after.name !== before.name) body['name'] = after.name;
    if (after.color !== before.color) body['color'] = after.color;
    if (after.startDay !== before.startDay) body['start'] = after.startDay;
    if (after.duration !== before.duration) body['duration'] = after.duration;
    if (after.groupId !== before.groupId) {
      body['group'] = after.groupId ? parseGroupId(after.groupId) : null;
    }
    if (Object.keys(body).length === 0) return;
    try {
      await this.api.updateTask(apiId, body);
      this.toast.success(`Task “${after.name}” updated`);
    } catch (error) {
      this.toast.error(`Could not update task: ${describe(error)}`);
    }
  }

  async updateGroup(id: string, updates: { name: string; color: string }): Promise<void> {
    const apiId = parseGroupId(id);
    if (apiId === null) return;
    const before = this._groups().find((g) => g.id === id);
    if (!before) return;
    const trimmedName = updates.name.trim();
    if (!trimmedName) return;
    if (before.name === trimmedName && before.color === updates.color) return;
    this._groups.update((groups) =>
      groups.map((group) =>
        group.id === id ? { ...group, name: trimmedName, color: updates.color } : group,
      ),
    );
    try {
      await this.api.updateGroup(apiId, { name: trimmedName, color: updates.color });
      this.toast.success(`Group “${trimmedName}” updated`);
    } catch (error) {
      this.toast.error(`Could not update group: ${describe(error)}`);
    }
  }

  async removeGroup(id: string): Promise<void> {
    const group = this._groups().find((g) => g.id === id);
    const apiId = parseGroupId(id);
    if (apiId === null) return;
    try {
      await this.api.deleteGroup(apiId);
      this._groups.update((groups) => groups.filter((g) => g.id !== id));
      this._tasks.update((tasks) => tasks.filter((task) => task.groupId !== id));
      this.toast.success(group ? `Group “${group.name}” deleted` : 'Group deleted');
    } catch (error) {
      this.toast.error(`Could not delete group: ${describe(error)}`);
    }
  }

  toggleGroup(id: string): void {
    this._groups.update((groups) =>
      groups.map((group) =>
        group.id === id ? { ...group, collapsed: !group.collapsed } : group,
      ),
    );
  }

  exportState(): GanttExport {
    return {
      version: EXPORT_VERSION,
      groups: this._groups().map((group) => ({ ...group })),
      tasks: this._tasks().map((task) => ({ ...task })),
    };
  }

  importState(data: unknown): void {
    const parsed = parseExport(data);
    this._groups.set(parsed.groups);
    this._tasks.set(parsed.tasks);
  }

  moveGroup(groupId: string, desiredStartDay: number): void {
    const groupTasks = this._tasks().filter((task) => task.groupId === groupId);
    if (groupTasks.length === 0) return;
    const currentStart = Math.min(...groupTasks.map((task) => task.startDay));
    let delta = desiredStartDay - currentStart;
    if (currentStart + delta < 0) {
      delta = -currentStart;
    }
    if (delta === 0) return;
    this._tasks.update((tasks) =>
      tasks.map((task) =>
        task.groupId === groupId ? { ...task, startDay: task.startDay + delta } : task,
      ),
    );
  }
}

function mapApiGroups(apiGroups: ApiGroup[]): { groups: Group[]; tasks: Task[] } {
  const sortedGroups = [...apiGroups].sort((a, b) => a.order - b.order);
  const groups: Group[] = sortedGroups.map((g) => ({
    id: groupKey(g.id),
    name: g.name,
    color: g.color,
    collapsed: false,
  }));
  const tasks: Task[] = [];
  for (const g of sortedGroups) {
    const sortedTasks = [...g.tasks].sort((a, b) => a.order - b.order);
    for (const t of sortedTasks) {
      tasks.push({
        id: taskKey(t.id),
        name: t.name,
        color: t.color,
        startDay: t.start,
        duration: t.duration,
        groupId: groupKey(g.id),
      });
    }
  }
  return { groups, tasks };
}

function parseExport(data: unknown): { groups: Group[]; tasks: Task[] } {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: expected a JSON object.');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj['groups']) || !Array.isArray(obj['tasks'])) {
    throw new Error('Invalid file: missing "groups" or "tasks" arrays.');
  }
  const groups = obj['groups'].map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Invalid group at index ${index}.`);
    }
    const g = raw as Record<string, unknown>;
    if (
      typeof g['id'] !== 'string' ||
      typeof g['name'] !== 'string' ||
      typeof g['color'] !== 'string'
    ) {
      throw new Error(`Invalid group at index ${index}.`);
    }
    return {
      id: g['id'],
      name: g['name'],
      color: g['color'],
      collapsed: typeof g['collapsed'] === 'boolean' ? g['collapsed'] : false,
    } satisfies Group;
  });
  const groupIds = new Set(groups.map((g) => g.id));
  const tasks = obj['tasks'].map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Invalid task at index ${index}.`);
    }
    const t = raw as Record<string, unknown>;
    if (
      typeof t['id'] !== 'string' ||
      typeof t['name'] !== 'string' ||
      typeof t['color'] !== 'string' ||
      typeof t['startDay'] !== 'number' ||
      typeof t['duration'] !== 'number'
    ) {
      throw new Error(`Invalid task at index ${index}.`);
    }
    const groupId =
      typeof t['groupId'] === 'string' && groupIds.has(t['groupId'])
        ? (t['groupId'] as string)
        : null;
    return {
      id: t['id'],
      name: t['name'],
      color: t['color'],
      startDay: Math.max(0, Math.floor(t['startDay'])),
      duration: Math.max(1, Math.floor(t['duration'])),
      groupId,
    } satisfies Task;
  });
  return { groups, tasks };
}

function computeSpan(tasks: Task[]): GroupSpan | null {
  if (tasks.length === 0) return null;
  let start = Infinity;
  let end = -Infinity;
  for (const task of tasks) {
    if (task.startDay < start) start = task.startDay;
    if (task.startDay + task.duration > end) end = task.startDay + task.duration;
  }
  return { startDay: start, duration: end - start };
}
