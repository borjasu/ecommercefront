import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly categorias = ['Mujer', 'Hombre', 'Accesorios', 'Nuevo'];
  readonly usuarioActual = this.authService.currentUser;
  readonly cantidadCarrito = this.cartService.cantidadItems;

  readonly terminoBusqueda = signal('');
  readonly menuUsuarioAbierto = signal(false);
  readonly menuMovilAbierto = signal(false);

  @HostListener('document:click', ['$event'])
  alHacerClickFuera(evento: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(evento.target as Node)) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  alternarMenuUsuario(): void {
    this.menuUsuarioAbierto.update(abierto => !abierto);
  }

  alternarMenuMovil(): void {
    this.menuMovilAbierto.update(abierto => !abierto);
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto.set(false);
    this.authService.logout();
  }
}
