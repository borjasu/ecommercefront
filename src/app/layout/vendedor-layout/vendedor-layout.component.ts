import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-vendedor-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './vendedor-layout.component.html'
})
export class VendedorLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly usuarioActual = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
