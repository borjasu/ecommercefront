import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto, Talla } from '../../../core/models/producto.model';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './producto-card.component.html'
})
export class ProductoCardComponent {
  readonly producto = input.required<Producto>();
  readonly agregarAlCarrito = output<{ producto: Producto; talla: Talla }>();

  readonly tallaSeleccionada = signal<Talla | null>(null);
  readonly agregado = signal(false);

  seleccionarTalla(talla: Talla): void {
    this.tallaSeleccionada.set(talla);
  }

  onAgregar(): void {
    const talla = this.tallaSeleccionada();
    if (!talla) {
      return;
    }

    this.agregarAlCarrito.emit({ producto: this.producto(), talla });
    this.agregado.set(true);
    setTimeout(() => this.agregado.set(false), 1500);
  }
}
