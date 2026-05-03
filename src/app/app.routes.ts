import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./gantt/gantt').then((m) => m.GanttComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
