import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    pathMatch: 'full',
    loadComponent: () =>
      import('./boards/boards-list.component').then((m) => m.BoardsListComponent),
  },
  {
    path: 'app/board/:id',
    loadComponent: () => import('./gantt/gantt.component').then((m) => m.GanttComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
