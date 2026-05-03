import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ApiGroup,
  EXPORT_VERSION,
  GanttExport,
  GanttRow,
  Group,
  GroupSpan,
  MIN_VISIBLE_DAYS,
  Task,
  TRAILING_PADDING_DAYS,
} from '../models';
import { GanttApiService } from './gantt-api.service';

const groupKey = (id: number) => `g-${id}`;
const taskKey = (id: number) => `t-${id}`;
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

  private readonly _groups = signal<Group[]>([]);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _loaded = signal(false);
  private readonly _loadError = signal<string | null>(null);

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

  async load(): Promise<void> {
    try {
      const data = await this.api.listGroups();
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
    const order = this._tasks().filter((t) => t.groupId === task.groupId).length;
    const apiGroup = task.groupId ? parseGroupId(task.groupId) : null;
    const created = await this.api.createTask({
      name: task.name,
      color: task.color,
      order,
      start: task.startDay,
      duration: task.duration,
      group: apiGroup,
    });
    const newTask: Task = {
      ...task,
      id: taskKey(created.id),
    };
    this._tasks.update((tasks) => [...tasks, newTask]);
  }

  async addGroup(group: Omit<Group, 'id' | 'collapsed'>): Promise<string> {
    const order = this._groups().length;
    const created = await this.api.createGroup({
      name: group.name,
      color: group.color,
      order,
    });
    const id = groupKey(created.id);
    this._groups.update((groups) => [...groups, { ...group, id, collapsed: false }]);
    return id;
  }

  async persistTaskBounds(id: string): Promise<void> {
    const apiId = parseTaskId(id);
    if (apiId === null) return;
    const task = this._tasks().find((t) => t.id === id);
    if (!task) return;
    await this.api.updateTask(apiId, {
      start: task.startDay,
      duration: task.duration,
    });
  }

  async persistGroupTaskBounds(groupId: string): Promise<void> {
    const tasks = this._tasks().filter((t) => t.groupId === groupId);
    await Promise.all(
      tasks.map((task) => {
        const apiId = parseTaskId(task.id);
        if (apiId === null) return Promise.resolve();
        return this.api.updateTask(apiId, { start: task.startDay });
      }),
    );
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

  placeTaskRelativeTo(
    draggedId: string,
    targetId: string,
    position: 'above' | 'below',
  ): void {
    if (draggedId === targetId) return;
    this._tasks.update((tasks) => {
      const dragged = tasks.find((t) => t.id === draggedId);
      const target = tasks.find((t) => t.id === targetId);
      if (!dragged || !target) return tasks;
      const without = tasks.filter((t) => t.id !== draggedId);
      const targetIdx = without.findIndex((t) => t.id === targetId);
      if (targetIdx === -1) return tasks;
      const insertAt = position === 'above' ? targetIdx : targetIdx + 1;
      const updated: Task = { ...dragged, groupId: target.groupId };
      const next = [...without];
      next.splice(insertAt, 0, updated);
      return next;
    });
  }

  placeGroupRelativeTo(
    draggedId: string,
    targetId: string,
    position: 'above' | 'below',
  ): void {
    if (draggedId === targetId) return;
    this._groups.update((groups) => {
      const dragged = groups.find((g) => g.id === draggedId);
      if (!dragged) return groups;
      const without = groups.filter((g) => g.id !== draggedId);
      const targetIdx = without.findIndex((g) => g.id === targetId);
      if (targetIdx === -1) return groups;
      const insertAt = position === 'above' ? targetIdx : targetIdx + 1;
      const next = [...without];
      next.splice(insertAt, 0, dragged);
      return next;
    });
  }

  placeTaskInGroup(draggedId: string, groupId: string | null): void {
    this._tasks.update((tasks) => {
      const dragged = tasks.find((t) => t.id === draggedId);
      if (!dragged) return tasks;
      if (groupId !== null && !this._groups().some((g) => g.id === groupId)) {
        return tasks;
      }
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
  }

  updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): void {
    this._tasks.update((tasks) =>
      tasks.map((task) => {
        if (task.id !== id) return task;
        const next: Task = { ...task, ...updates };
        next.startDay = Math.max(0, Math.floor(next.startDay));
        next.duration = Math.max(1, Math.floor(next.duration));
        if (next.groupId !== null && !this._groups().some((g) => g.id === next.groupId)) {
          next.groupId = null;
        }
        return next;
      }),
    );
  }

  removeGroup(id: string): void {
    this._groups.update((groups) => groups.filter((group) => group.id !== id));
    this._tasks.update((tasks) =>
      tasks.map((task) => (task.groupId === id ? { ...task, groupId: null } : task)),
    );
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
