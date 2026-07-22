import { Component, ElementRef, HostListener, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
    selector: 'app-header',
    imports: [RouterLink],
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './header.component.css'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);

  readonly categorias = ['Mujer', 'Hombre', 'Accesorios', 'Nuevo'];
  readonly usuarioActual = this.authService.currentUser;
  readonly cantidadCarrito = this.cartService.cantidadItems;

  readonly terminoBusqueda = signal('');
  readonly menuUsuarioAbierto = signal(false);
  readonly menuMovilAbierto = signal(false);

  constructor() {
    toObservable(this.terminoBusqueda)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(termino => {
        const terminoLimpio = termino.trim();
        if (terminoLimpio) {
          this.router.navigate(['/buscar'], { queryParams: { q: terminoLimpio } });
        }
      });
  }

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
