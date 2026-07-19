import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
  {
    path: 'catalogo',
    loadComponent: () => import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro/registro.component').then(m => m.RegistroComponent)
  },
  {
    path: 'vendedor',
    canActivate: [authGuard, roleGuard],
    children: [
      // rutas de dashboard vendedor se agregarán en fase posterior, dejar placeholder si aún no existen
    ]
  },
  { path: '**', redirectTo: 'catalogo' }
];
