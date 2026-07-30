import { Injectable, computed, effect, signal } from '@angular/core';
import { ItemCarrito } from '../models/carrito.model';
import { Color, Producto, Talla } from '../models/producto.model';

const CLAVE_CARRITO = 'carrito_items';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly items = signal<ItemCarrito[]>(this.leerCarritoGuardado());

  readonly itemsCarrito = this.items.asReadonly();

  readonly cantidadItems = computed(() =>
    this.items().reduce((total, item) => total + item.cantidad, 0)
  );

  readonly total = computed(() =>
    this.items().reduce((total, item) => total + item.producto.precio * item.cantidad, 0)
  );

  constructor() {
    effect(() => {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(this.items()));
    });
  }

  agregarItem(producto: Producto, talla: Talla, cantidad: number, color?: Color): void {
    this.items.update(items => {
      const existente = items.find(item => this.esMismaLinea(item, producto.id, talla, color));

      if (existente) {
        return items.map(item =>
          item === existente ? { ...item, cantidad: item.cantidad + cantidad } : item
        );
      }

      return [...items, { producto, talla, color, cantidad }];
    });
  }

  eliminarItem(producto: Producto, talla: Talla, color?: Color): void {
    this.items.update(items => items.filter(item => !this.esMismaLinea(item, producto.id, talla, color)));
  }

  actualizarCantidad(productoId: string, talla: Talla, cantidad: number, color?: Color): void {
    if (cantidad <= 0) {
      this.items.update(items => items.filter(item => !this.esMismaLinea(item, productoId, talla, color)));
      return;
    }

    this.items.update(items =>
      items.map(item => (this.esMismaLinea(item, productoId, talla, color) ? { ...item, cantidad } : item))
    );
  }

  private esMismaLinea(item: ItemCarrito, productoId: string, talla: Talla, color?: Color): boolean {
    return item.producto.id === productoId && item.talla === talla && item.color === color;
  }

  vaciarCarrito(): void {
    this.items.set([]);
  }

  private leerCarritoGuardado(): ItemCarrito[] {
    const guardado = localStorage.getItem(CLAVE_CARRITO);

    if (!guardado) {
      return [];
    }

    try {
      const items = JSON.parse(guardado);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }
}
