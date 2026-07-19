import { Producto } from './producto.model';

export interface ItemCarrito {
  producto: Producto;
  talla: string;
  cantidad: number;
}

export interface Carrito {
  items: ItemCarrito[];
  total: number;
}
