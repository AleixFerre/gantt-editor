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
