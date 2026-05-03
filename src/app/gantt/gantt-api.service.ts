import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiGroup,
  ApiTask,
  CreateGroupBody,
  CreateTaskBody,
  UpdateTaskBody,
} from '../models';

@Injectable({ providedIn: 'root' })
export class GanttApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listGroups(): Promise<ApiGroup[]> {
    return firstValueFrom(this.http.get<ApiGroup[]>(`${this.base}/groups`));
  }

  createGroup(body: CreateGroupBody): Promise<ApiGroup> {
    return firstValueFrom(this.http.post<ApiGroup>(`${this.base}/groups`, body));
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
