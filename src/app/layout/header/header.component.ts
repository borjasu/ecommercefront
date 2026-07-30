import { Component, ElementRef, effect, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { AUDIENCIAS, CATEGORIAS } from '../../shared/constants/categorias';

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
  private readonly favoritosService = inject(FavoritosService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly audiencias = AUDIENCIAS;
  readonly categorias = CATEGORIAS;

  readonly usuarioActual = this.authService.currentUser;
  readonly cantidadCarrito = this.cartService.cantidadItems;
  readonly cantidadFavoritos = this.favoritosService.cantidad;

  readonly terminoBusqueda = signal('');
  readonly menuAbierto = signal(false);
  readonly busquedaMovilAbierta = signal(false);

  readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  readonly inputBusquedaMovil = viewChild<ElementRef<HTMLInputElement>>('inputBusquedaMovil');

  constructor() {
    toObservable(this.terminoBusqueda)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(termino => {
        const terminoLimpio = termino.trim();
        if (terminoLimpio) {
          this.router.navigate(['/buscar'], { queryParams: { q: terminoLimpio } });
        }
      });

    effect(() => {
      if (this.menuAbierto()) {
        setTimeout(() => this.drawer()?.nativeElement.focus());
      }
    });

    effect(() => {
      if (this.busquedaMovilAbierta()) {
        setTimeout(() => this.inputBusquedaMovil()?.nativeElement.focus());
      }
    });
  }

  alternarBusquedaMovil(): void {
    this.busquedaMovilAbierta.update(abierta => !abierta);
  }

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  onDrawerKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.cerrarMenu();
      return;
    }

    if (evento.key !== 'Tab') {
      return;
    }

    const contenedor = this.drawer()?.nativeElement;
    if (!contenedor) {
      return;
    }

    const focusables = contenedor.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) {
      return;
    }

    const primero = focusables[0];
    const ultimo = focusables[focusables.length - 1];

    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Seguro que quieres cerrar sesión?',
      textoConfirmar: 'Cerrar sesión',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.cerrarMenu();
    this.authService.logout();
    this.toastService.exito('Sesión cerrada.');
  }
}
