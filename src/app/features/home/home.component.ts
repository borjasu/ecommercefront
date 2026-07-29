import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { Producto, Talla } from '../../core/models/producto.model';
import { ProductoCardComponent } from '../../shared/components/producto-card/producto-card.component';

@Component({
    selector: 'app-home',
    imports: [RouterLink, ProductoCardComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './home.component.html'
})
export class HomeComponent {
  private readonly productoService = inject(ProductoService);
  private readonly cartService = inject(CartService);

  readonly destacados = signal<Producto[]>([]);

  constructor() {
    this.productoService.obtenerDestacados().subscribe(productos => this.destacados.set(productos));
  }

  onAgregarAlCarrito(evento: { producto: Producto; talla: Talla; cantidad: number }): void {
    this.cartService.agregarItem(evento.producto, evento.talla, evento.cantidad);
  }
}
