import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  readonly categorias = ['Mujer', 'Hombre', 'Accesorios', 'Nuevo'];
  readonly usuarioActual = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.logout();
  }
}
