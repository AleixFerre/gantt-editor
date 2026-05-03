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
import { ToastService } from '../shared/toast.service';

@Injectable({ providedIn: 'root' })
export class GanttApiService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly base = environment.apiBaseUrl;

  listGroups(): Promise<ApiGroup[]> {
    return firstValueFrom(this.http.get<ApiGroup[]>(`${this.base}/groups`));
  }

  createGroup(body: CreateGroupBody): Promise<ApiGroup> {
    return this.notify(
      firstValueFrom(this.http.post<ApiGroup>(`${this.base}/groups`, body)),
      'Group created',
      'Could not create group',
    );
  }

  createTask(body: CreateTaskBody): Promise<ApiTask> {
    return this.notify(
      firstValueFrom(this.http.post<ApiTask>(`${this.base}/tasks`, body)),
      'Task created',
      'Could not create task',
    );
  }

  updateTask(id: number, body: UpdateTaskBody): Promise<ApiTask> {
    return this.notify(
      firstValueFrom(this.http.patch<ApiTask>(`${this.base}/tasks/${id}`, body)),
      'Task updated',
      'Could not update task',
    );
  }

  private async notify<T>(
    promise: Promise<T>,
    successMessage: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      const result = await promise;
      this.toast.success(successMessage);
      return result;
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      this.toast.error(detail ? `${errorMessage}: ${detail}` : errorMessage);
      throw error;
    }
  }
}
