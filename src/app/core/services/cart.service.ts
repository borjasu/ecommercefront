import { Injectable, computed, effect, signal } from '@angular/core';
import { ItemCarrito } from '../models/carrito.model';
import { Producto, Talla } from '../models/producto.model';

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

  agregarItem(producto: Producto, talla: Talla, cantidad: number): void {
    this.items.update(items => {
      const existente = items.find(item => item.producto.id === producto.id && item.talla === talla);

      if (existente) {
        return items.map(item =>
          item === existente ? { ...item, cantidad: item.cantidad + cantidad } : item
        );
      }

      return [...items, { producto, talla, cantidad }];
    });
  }

  eliminarItem(producto: Producto, talla: Talla): void {
    this.items.update(items =>
      items.filter(item => !(item.producto.id === producto.id && item.talla === talla))
    );
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
