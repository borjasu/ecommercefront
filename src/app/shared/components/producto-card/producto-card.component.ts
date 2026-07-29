import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto, Talla } from '../../../core/models/producto.model';

const CANTIDAD_MINIMA = 1;
const CANTIDAD_MAXIMA = 20;

@Component({
    selector: 'app-producto-card',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './producto-card.component.html'
})
export class ProductoCardComponent {
  readonly producto = input.required<Producto>();
  readonly agregarAlCarrito = output<{ producto: Producto; talla: Talla; cantidad: number }>();

  readonly tallaSeleccionada = signal<Talla | null>(null);
  readonly cantidadSeleccionada = signal(CANTIDAD_MINIMA);
  readonly agregado = signal(false);

  seleccionarTalla(talla: Talla): void {
    this.tallaSeleccionada.set(talla);
  }

  decrementarCantidad(): void {
    this.cantidadSeleccionada.update(cantidad => Math.max(CANTIDAD_MINIMA, cantidad - 1));
  }

  incrementarCantidad(): void {
    this.cantidadSeleccionada.update(cantidad => Math.min(CANTIDAD_MAXIMA, cantidad + 1));
  }

  onAgregar(): void {
    const talla = this.tallaSeleccionada();
    if (!talla) {
      return;
    }

    this.agregarAlCarrito.emit({ producto: this.producto(), talla, cantidad: this.cantidadSeleccionada() });
    this.agregado.set(true);
    this.cantidadSeleccionada.set(1);
    setTimeout(() => this.agregado.set(false), 1500);
  }
}
