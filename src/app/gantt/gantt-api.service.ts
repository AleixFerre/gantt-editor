import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiTask {
  id: number;
  name: string;
  color: string;
  order: number;
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
  order: number;
}

export interface CreateTaskBody {
  name: string;
  color: string;
  order: number;
  group: number | null;
}

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
}
