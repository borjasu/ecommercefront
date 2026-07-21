import { Producto, Talla } from './producto.model';

export interface ItemCarrito {
  producto: Producto;
  talla: Talla;
  cantidad: number;
}

export interface Carrito {
  items: ItemCarrito[];
  total: number;
}
