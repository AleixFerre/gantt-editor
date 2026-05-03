import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AuthUser = {
  userId: number;
  email: string;
  name: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(
        `${this.base}/auth/login`,
        { email, password },
        { withCredentials: true },
      ),
    );
    this._user.set(res.user);
    return res.user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true }),
    );
    this._user.set(null);
  }

  async me(): Promise<AuthUser | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: AuthUser }>(`${this.base}/auth/me`, {
          withCredentials: true,
        }),
      );
      this._user.set(res.user);
      return res.user;
    } catch {
      this._user.set(null);
      return null;
    }
  }
}
