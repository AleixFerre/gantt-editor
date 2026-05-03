// ----- Constants ----------------------------------------------------------

export const DAY_WIDTH_PX = 40;
export const ROW_HEIGHT_PX = 44;

export const MIN_VISIBLE_DAYS = 30;
export const TRAILING_PADDING_DAYS = 5;
export const EXPORT_VERSION = 1;

export const TOAST_DISMISS_MS = 2500;

export const GROUP_COLORS = [
  '#6366f1',
  '#0d9488',
  '#db2777',
  '#7c3aed',
  '#ca8a04',
  '#dc2626',
  '#0284c7',
];

export const TASK_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#16a34a',
  '#ea580c',
  '#db2777',
  '#0d9488',
  '#ca8a04',
  '#7c3aed',
];

// ----- Domain models ------------------------------------------------------

export interface Task {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  color: string;
  groupId: string | null;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface GroupSpan {
  startDay: number;
  duration: number;
}

export type GanttRow =
  | {
      readonly kind: 'group';
      readonly group: Group;
      readonly span: GroupSpan | null;
      readonly taskCount: number;
    }
  | {
      readonly kind: 'task';
      readonly task: Task;
      readonly inGroup: boolean;
    };

export interface GanttExport {
  version: number;
  groups: Group[];
  tasks: Task[];
}

export interface TaskEdit {
  name: string;
  groupId: string | null;
  startDay: number;
  duration: number;
  color: string;
}

// ----- API DTOs -----------------------------------------------------------

export interface ApiTask {
  id: number;
  name: string;
  color: string;
  order: number;
  start: number;
  duration: number;
  group: number | null;
}

export interface ApiGroup {
  id: number;
  name: string;
  color: string;
  order: number;
  tasks: ApiTask[];
}

export interface CreateGroupBody {
  name: string;
  color: string;
}

export interface CreateTaskBody {
  name: string;
  color: string;
  start: number;
  duration: number;
  group: number | null;
}

export type UpdateTaskBody = Partial<CreateTaskBody> & { order?: number };

// ----- Toasts -------------------------------------------------------------

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
