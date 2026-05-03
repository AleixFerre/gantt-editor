import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./gantt/gantt').then((m) => m.GanttComponent),
  },
];
