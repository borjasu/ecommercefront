import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ItemCarrito } from '../../core/models/carrito.model';

@Component({
    selector: 'app-carrito',
    imports: [RouterLink],
    templateUrl: './carrito.component.html'
})
export class CarritoComponent {
  private readonly cartService = inject(CartService);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;

  subtotal(item: ItemCarrito): number {
    return item.producto.precio * item.cantidad;
  }

  eliminar(item: ItemCarrito): void {
    this.cartService.eliminarItem(item.producto, item.talla);
  }
}
