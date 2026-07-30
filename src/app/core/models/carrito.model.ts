import { Color, Producto, Talla } from './producto.model';

export interface ItemCarrito {
  producto: Producto;
  talla: Talla;
  color?: Color;
  cantidad: number;
}

export interface Carrito {
  items: ItemCarrito[];
  total: number;
}
