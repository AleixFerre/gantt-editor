import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiBoard,
  ApiGroup,
  ApiTask,
  CreateGroupBody,
  CreateTaskBody,
  ReorderBody,
  UpdateGroupBody,
  UpdateTaskBody,
} from './gantt-api.service.model';

@Injectable({ providedIn: 'root' })
export class GanttApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listBoards(): Promise<ApiBoard[]> {
    return firstValueFrom(this.http.get<ApiBoard[]>(`${this.base}/boards`));
  }

  createBoard(name: string): Promise<ApiBoard> {
    return firstValueFrom(this.http.post<ApiBoard>(`${this.base}/boards`, { name }));
  }

  listGroups(boardId: number): Promise<ApiGroup[]> {
    const params = new HttpParams().set('board', String(boardId));
    return firstValueFrom(
      this.http.get<ApiGroup[]>(`${this.base}/groups`, { params }),
    );
  }

  createGroup(body: CreateGroupBody): Promise<ApiGroup> {
    return firstValueFrom(this.http.post<ApiGroup>(`${this.base}/groups`, body));
  }

  updateGroup(id: number, body: UpdateGroupBody): Promise<ApiGroup> {
    return firstValueFrom(
      this.http.patch<ApiGroup>(`${this.base}/groups/${id}`, body),
    );
  }

  deleteGroup(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/groups/${id}`));
  }

  reorderGroups(body: ReorderBody): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(`${this.base}/groups/reorder`, body),
    );
  }

  reorderTasks(body: ReorderBody): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(`${this.base}/tasks/reorder`, body),
    );
  }

  createTask(body: CreateTaskBody): Promise<ApiTask> {
    return firstValueFrom(this.http.post<ApiTask>(`${this.base}/tasks`, body));
  }

  updateTask(id: number, body: UpdateTaskBody): Promise<ApiTask> {
    return firstValueFrom(
      this.http.patch<ApiTask>(`${this.base}/tasks/${id}`, body),
    );
  }
}
