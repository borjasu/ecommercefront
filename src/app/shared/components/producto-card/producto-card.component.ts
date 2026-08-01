import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../../core/models/producto.model';
import { SelectorProductoModalService } from '../../../core/services/selector-producto-modal.service';
import { FavoritosService } from '../../../core/services/favoritos.service';
import { ToastService } from '../../../core/services/toast.service';
import { OfertaService } from '../../../core/services/oferta.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-producto-card',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './producto-card.component.html',
    // El host debe estirarse a la altura de la celda del grid (align-items:
    // stretch es el default de CSS Grid) — sin esto, <article> solo toma su
    // altura de contenido y el botón "AGREGAR" queda a distinta altura entre
    // tarjetas de la misma fila según qué tan largo sea el nombre del producto.
    host: { class: 'block h-full' }
})
export class ProductoCardComponent {
  private readonly modalService = inject(SelectorProductoModalService);
  private readonly toastService = inject(ToastService);
  private readonly ofertaService = inject(OfertaService);
  private readonly authService = inject(AuthService);
  readonly favoritosService = inject(FavoritosService);

  readonly producto = input.required<Producto>();

  precioInfo() {
    return this.ofertaService.calcularPrecio(this.producto());
  }

  abrirModal(): void {
    this.modalService.abrir(this.producto());
  }

  alternarFavorito(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();

    if (!this.authService.currentUser()) {
      this.toastService.error('Inicia sesión para guardar tus favoritos.');
      return;
    }

    const eraFavorito = this.favoritosService.esFavorito(this.producto().id);
    this.favoritosService.alternar(this.producto().id);
    this.toastService.exito(eraFavorito ? 'Se quitó de tus favoritos.' : 'Se agregó a tus favoritos.');
  }
}
