import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color } from '../../core/models/producto.model';
import { ColoresService } from '../../core/services/colores.service';

@Component({
    selector: 'app-carrito',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './carrito.component.html'
})
export class CarritoComponent {
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly coloresService = inject(ColoresService);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;
  readonly totalArticulos = this.cartService.cantidadItems;

  subtotal(item: ItemCarrito): number {
    return item.producto.precio * item.cantidad;
  }

  incrementar(item: ItemCarrito): void {
    this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad + 1, item.color);
  }

  async decrementar(item: ItemCarrito): Promise<void> {
    if (item.cantidad - 1 <= 0) {
      const confirmado = await this.confirmService.confirmar({
        titulo: 'Quitar de la bolsa',
        mensaje: `¿Quitar "${item.producto.nombre}" de la bolsa?`,
        textoConfirmar: 'Quitar',
        peligroso: true
      });

      if (!confirmado) {
        return;
      }

      this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad - 1, item.color);
      this.toastService.exito(`"${item.producto.nombre}" se quitó de tu bolsa.`);
      return;
    }

    this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad - 1, item.color);
  }

  async eliminar(item: ItemCarrito): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Quitar de la bolsa',
      mensaje: `¿Quitar "${item.producto.nombre}" de la bolsa?`,
      textoConfirmar: 'Quitar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.cartService.eliminarItem(item.producto, item.talla, item.color);
    this.toastService.exito(`"${item.producto.nombre}" se quitó de tu bolsa.`);
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  hexDeColor(color: Color): string {
    return this.coloresService.hexDe(color);
  }
}
