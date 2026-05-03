import { ApiBoard, ApiGroup, ApiTask, ReorderBody } from '../gantt/gantt-api.service.model';

export type GroupChanges = Partial<{
  name: string;
  color: string;
  order: number;
}>;

export type TaskChanges = Partial<{
  name: string;
  color: string;
  order: number;
  start: number;
  duration: number;
  group: number | null;
}>;

export type BoardEvent =
  | { type: 'group.created'; clientId: string | null; group: ApiGroup }
  | { type: 'group.updated'; clientId: string | null; id: number; changes: GroupChanges }
  | {
      type: 'group.deleted';
      clientId: string | null;
      id: number;
      deletedTaskIds: number[];
    }
  | { type: 'groups.reordered'; clientId: string | null; updates: ReorderBody }
  | { type: 'task.created'; clientId: string | null; task: ApiTask }
  | { type: 'task.updated'; clientId: string | null; id: number; changes: TaskChanges }
  | { type: 'tasks.reordered'; clientId: string | null; updates: ReorderBody };

export type UserBoardsEvent =
  | { type: 'board.created'; clientId: string | null; board: ApiBoard }
  | { type: 'board.updated'; clientId: string | null; id: number; name: string }
  | { type: 'board.deleted'; clientId: string | null; id: number };

export const BOARD_EVENT_TYPES: ReadonlyArray<BoardEvent['type']> = [
  'group.created',
  'group.updated',
  'group.deleted',
  'groups.reordered',
  'task.created',
  'task.updated',
  'tasks.reordered',
];

export const USER_BOARDS_EVENT_TYPES: ReadonlyArray<UserBoardsEvent['type']> = [
  'board.created',
  'board.updated',
  'board.deleted',
];
