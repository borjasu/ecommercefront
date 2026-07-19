export type EtiquetaProducto = 'NUEVO' | 'ESENCIAL';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  tallas: string[];
  categoria: string;
  imagenUrl: string;
  etiqueta?: EtiquetaProducto;
}
