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
    templateUrl: './producto-card.component.html'
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
