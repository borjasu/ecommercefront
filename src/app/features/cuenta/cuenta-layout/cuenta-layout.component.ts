import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';

const ETIQUETAS_SECCION: Record<string, string> = {
  pedidos: 'Pedidos',
  'datos-personales': 'Datos personales',
  direcciones: 'Direcciones'
};

@Component({
    selector: 'app-cuenta-layout',
    imports: [RouterLink, RouterLinkActive, RouterOutlet, BreadcrumbComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './cuenta-layout.component.html'
})
export class CuentaLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly usuarioActual = this.authService.currentUser;

  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map(evento => evento.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const url = this.urlActual();
    const items: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, { label: 'Mi cuenta', url: '/cuenta/perfil' }];

    const seccion = Object.keys(ETIQUETAS_SECCION).find(clave => url.includes(`/cuenta/${clave}`));
    if (seccion) {
      items.push({ label: ETIQUETAS_SECCION[seccion] });
    } else {
      items.push({ label: 'Perfil' });
    }

    return items;
  });
}
