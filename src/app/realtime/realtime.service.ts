import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  BOARD_EVENT_TYPES,
  BoardEvent,
  USER_BOARDS_EVENT_TYPES,
  UserBoardsEvent,
} from './realtime.events';

const CLIENT_ID_KEY = 'realtime:clientId';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly clientId = readOrCreateClientId();
  readonly connected = signal(false);
  readonly boardEvents$ = new Subject<BoardEvent>();
  readonly userBoardsEvents$ = new Subject<UserBoardsEvent>();
  readonly resync$ = new Subject<{ scope: 'board' | 'userBoards'; boardId?: number }>();

  private socket: Socket | null = null;
  private subscribedBoardId: number | null = null;

  ensureConnected(): void {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }
    const socket = io(environment.apiBaseUrl, {
      path: '/ws',
      withCredentials: true,
      autoConnect: true,
      query: { clientId: this.clientId },
      reconnection: true,
      reconnectionDelayMax: 30_000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      if (this.subscribedBoardId !== null) {
        const boardId = this.subscribedBoardId;
        socket.emit('subscribe', { boardId }, (ack: { ok: boolean } | undefined) => {
          if (ack?.ok) this.resync$.next({ scope: 'board', boardId });
        });
      }
      this.resync$.next({ scope: 'userBoards' });
    });

    socket.on('disconnect', () => {
      this.connected.set(false);
    });

    socket.on('connect_error', (err: Error) => {
      this.connected.set(false);
      if (err.message === 'Forbidden') {
        socket.disconnect();
      }
    });

    for (const type of BOARD_EVENT_TYPES) {
      socket.on(type, (payload: BoardEvent) => {
        if (payload.clientId && payload.clientId === this.clientId) return;
        this.boardEvents$.next(payload);
      });
    }
    for (const type of USER_BOARDS_EVENT_TYPES) {
      socket.on(type, (payload: UserBoardsEvent) => {
        if (payload.clientId && payload.clientId === this.clientId) return;
        this.userBoardsEvents$.next(payload);
      });
    }
  }

  subscribeBoard(boardId: number): void {
    this.ensureConnected();
    this.subscribedBoardId = boardId;
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { boardId });
    }
  }

  unsubscribeBoard(boardId: number): void {
    if (this.subscribedBoardId === boardId) this.subscribedBoardId = null;
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { boardId });
    }
  }

  disconnect(): void {
    this.subscribedBoardId = null;
    this.socket?.disconnect();
    this.connected.set(false);
  }
}

function readOrCreateClientId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}
