import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { RealtimeService } from './realtime.service';

export const clientIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
  const realtime = inject(RealtimeService);
  return next(req.clone({ setHeaders: { 'X-Client-Id': realtime.clientId } }));
};
