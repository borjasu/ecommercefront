import { Component, ElementRef, HostListener, effect, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
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
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);

  readonly audiencias = AUDIENCIAS;
  readonly categorias = CATEGORIAS;

  readonly usuarioActual = this.authService.currentUser;
  readonly cantidadCarrito = this.cartService.cantidadItems;

  readonly terminoBusqueda = signal('');
  readonly menuUsuarioAbierto = signal(false);
  readonly menuAbierto = signal(false);

  readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

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

  cerrarSesion(): void {
    this.menuUsuarioAbierto.set(false);
    this.cerrarMenu();
    this.authService.logout();
  }
}
