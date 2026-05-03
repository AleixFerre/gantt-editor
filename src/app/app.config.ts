import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { credentialsInterceptor } from './auth/credentials.interceptor';
import { forbiddenInterceptor } from './auth/forbidden.interceptor';
import { clientIdInterceptor } from './realtime/client-id.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([credentialsInterceptor, clientIdInterceptor, forbiddenInterceptor]),
    ),
  ],
};
