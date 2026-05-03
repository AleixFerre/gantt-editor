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

export interface ApiBoard {
  id: number;
  name: string;
}

export interface CreateGroupBody {
  name: string;
  color: string;
  board: number;
}

export type UpdateGroupBody = Partial<{
  name: string;
  color: string;
  order: number;
}>;

export interface CreateTaskBody {
  name: string;
  color: string;
  start: number;
  duration: number;
  group: number | null;
}

export type UpdateTaskBody = Partial<CreateTaskBody> & { order?: number };

export type ReorderEntry = Record<number, number>;
export type ReorderBody = ReorderEntry[];
