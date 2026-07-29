import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { VendedorLayoutComponent } from './layout/vendedor-layout/vendedor-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
      },
      { path: 'catalogo', redirectTo: 'catalogo/hombre', pathMatch: 'full' },
      {
        path: 'catalogo/:audiencia',
        loadComponent: () =>
          import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent)
      },
      {
        path: 'catalogo/:audiencia/:categoria',
        loadComponent: () =>
          import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent)
      },
      {
        path: 'buscar',
        loadComponent: () =>
          import('./features/catalogo/catalogo.component').then(m => m.CatalogoComponent)
      },
      {
        path: 'producto/:id',
        loadComponent: () =>
          import('./features/producto-detalle/producto-detalle.component').then(
            m => m.ProductoDetalleComponent
          )
      },
      {
        path: 'carrito',
        loadComponent: () =>
          import('./features/carrito/carrito.component').then(m => m.CarritoComponent)
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/checkout/checkout.component').then(m => m.CheckoutComponent)
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'registro',
        loadComponent: () =>
          import('./features/auth/registro/registro.component').then(m => m.RegistroComponent)
      }
    ]
  },
  {
    path: 'vendedor',
    component: VendedorLayoutComponent,
    canActivate: [authGuard, roleGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/vendedor/dashboard/dashboard.component').then(
            m => m.DashboardComponent
          )
      },
      {
        path: 'mis-productos',
        loadComponent: () =>
          import('./features/vendedor/mis-productos/mis-productos.component').then(
            m => m.MisProductosComponent
          )
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/vendedor/pedidos/pedidos.component').then(m => m.PedidosComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
