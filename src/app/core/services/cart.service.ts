import { Injectable, computed, effect, signal } from '@angular/core';
import { ItemCarrito } from '../models/carrito.model';
import { Color, Producto, Talla } from '../models/producto.model';
import { stockDisponible } from '../../shared/utils/inventario.util';

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
    this.items().reduce((total, item) => total + this.precioUnitarioEfectivo(item) * item.cantidad, 0)
  );

  constructor() {
    effect(() => {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(this.items()));
    });
  }

  /**
   * Agrega `cantidad` piezas de talla+color al carrito, sin superar el stock
   * real del producto (sumando lo que ya hubiera de esa misma línea). Es la
   * última línea de defensa contra agregar más de lo que hay en inventario
   * aunque algún selector de cantidad no lo haya evitado antes; devuelve
   * cuánto se agregó realmente para que el llamador pueda avisar si se topó
   * con el límite.
   */
  agregarItem(producto: Producto, talla: Talla, cantidad: number, color?: Color): number {
    const disponible = stockDisponible(producto, talla, color ?? null);
    const yaEnCarrito = this.cantidadEnCarrito(producto.id, talla, color);
    const cantidadAgregada = Math.max(0, Math.min(cantidad, disponible - yaEnCarrito));

    if (cantidadAgregada === 0) {
      return 0;
    }

    this.items.update(items => {
      const existente = items.find(item => this.esMismaLinea(item, producto.id, talla, color));

      if (existente) {
        return items.map(item =>
          item === existente ? { ...item, cantidad: item.cantidad + cantidadAgregada } : item
        );
      }

      return [...items, { producto, talla, color, cantidad: cantidadAgregada }];
    });

    return cantidadAgregada;
  }

  cantidadEnCarrito(productoId: string, talla: Talla, color?: Color): number {
    return this.items().find(item => this.esMismaLinea(item, productoId, talla, color))?.cantidad ?? 0;
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

  // --- Precio de mayoreo (preview del carrito) ----------------------------
  //
  // El mínimo de mayoreo se define por PRODUCTO, sumando todas sus tallas y
  // colores combinados en el carrito (no por línea individual) — ej. 3 en M +
  // 3 en L = 6 piezas del mismo producto. Todo lo de aquí es solo para que el
  // comprador VEA el precio correcto antes de pagar; el cálculo autoritativo
  // real es el que hace OrdersService en el backend al crear el pedido (nunca
  // se confía en un precio que calcule el frontend).

  /** Piezas en el carrito de un mismo producto, sumando TODAS sus líneas (tallas/colores). */
  private cantidadTotalDe(productoId: string): number {
    return this.items()
      .filter(item => item.producto.id === productoId)
      .reduce((total, item) => total + item.cantidad, 0);
  }

  /** true si esta línea ya califica para el precio de mayoreo de su producto. */
  aplicaMayoreo(item: ItemCarrito): boolean {
    const producto = item.producto;
    return (
      !!producto.mayoreoHabilitado &&
      producto.mayoreoCantidadMinima != null &&
      producto.mayoreoPrecioPorPieza != null &&
      this.cantidadTotalDe(producto.id) >= producto.mayoreoCantidadMinima
    );
  }

  /** Precio unitario a cobrar/mostrar para esta línea: de mayoreo si aplica, si no el normal. */
  precioUnitarioEfectivo(item: ItemCarrito): number {
    return this.aplicaMayoreo(item) ? item.producto.mayoreoPrecioPorPieza! : item.producto.precio;
  }

  /**
   * Piezas que faltan (del mismo producto, sumando todas sus líneas) para
   * alcanzar el mínimo de mayoreo — 0 si el producto no tiene mayoreo
   * habilitado o si ya lo alcanzó. Usado para el mensaje "agrega N más...".
   */
  piezasParaMayoreo(item: ItemCarrito): number {
    const producto = item.producto;
    if (!producto.mayoreoHabilitado || producto.mayoreoCantidadMinima == null) {
      return 0;
    }
    return Math.max(0, producto.mayoreoCantidadMinima - this.cantidadTotalDe(producto.id));
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
