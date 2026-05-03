import { Injectable, computed, signal } from '@angular/core';
import { GanttRow, Group, GroupSpan, Task } from './task.model';

const MIN_VISIBLE_DAYS = 30;
const TRAILING_PADDING_DAYS = 5;

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly _groups = signal<Group[]>([
    { id: 'g-discovery', name: 'Discovery', color: '#6366f1', collapsed: false },
    { id: 'g-build', name: 'Build', color: '#0d9488', collapsed: false },
  ]);

  private readonly _tasks = signal<Task[]>([
    { id: 't-1', name: 'Research', startDay: 0, duration: 4, color: '#4f46e5', groupId: 'g-discovery' },
    { id: 't-2', name: 'Design', startDay: 3, duration: 6, color: '#0891b2', groupId: 'g-discovery' },
    { id: 't-3', name: 'Implementation', startDay: 8, duration: 10, color: '#16a34a', groupId: 'g-build' },
    { id: 't-4', name: 'QA & Launch', startDay: 17, duration: 5, color: '#ea580c', groupId: 'g-build' },
  ]);

  readonly tasks = this._tasks.asReadonly();
  readonly groups = this._groups.asReadonly();

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

  addTask(task: Omit<Task, 'id'>): void {
    const id = `t-${crypto.randomUUID()}`;
    this._tasks.update((tasks) => [...tasks, { ...task, id }]);
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

  addGroup(group: Omit<Group, 'id' | 'collapsed'>): string {
    const id = `g-${crypto.randomUUID()}`;
    this._groups.update((groups) => [...groups, { ...group, id, collapsed: false }]);
    return id;
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
