import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'game',
    loadComponent: () => import('./game/game').then((m) => m.Game),
  },
  { path: '**', redirectTo: '' },
];