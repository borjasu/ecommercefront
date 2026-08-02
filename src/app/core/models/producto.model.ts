export type Categoria = 'pantalon' | 'playera' | 'camisa' | 'bermuda';
export type Talla = string;
export type Etiqueta = 'NUEVO' | 'ESENCIAL' | null;
export type Audiencia = 'hombre' | 'nino';
export type Color = string;

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Categoria;
  audiencia: Audiencia;
  coloresDisponibles: Color[];
  tallasDisponibles: Talla[];
  imagenUrl: string;
  imagenes?: string[];
  etiqueta?: Etiqueta;
  destacado: boolean;
  // El backend ya calcula el precio con la oferta vigente aplicada en cada
  // respuesta de /productos — opcionales porque no todo objeto Producto en la
  // app viene directo de esa respuesta (p. ej. snapshots dentro de un pedido).
  precioOriginal?: number;
  precioFinal?: number;
  porcentajeDescuento?: number;
}
