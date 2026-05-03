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
  | { readonly kind: 'group'; readonly group: Group; readonly span: GroupSpan | null; readonly taskCount: number }
  | {
      readonly kind: 'task';
      readonly task: Task;
      readonly inGroup: boolean;
    };
