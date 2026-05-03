import { Group, Task } from './gantt.component.model';

export const MIN_VISIBLE_DAYS = 30;
export const TRAILING_PADDING_DAYS = 5;
export const EXPORT_VERSION = 1;

export interface GanttExport {
  version: number;
  groups: Group[];
  tasks: Task[];
}
