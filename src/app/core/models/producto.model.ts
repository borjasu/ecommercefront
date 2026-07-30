export type Categoria = 'pantalon' | 'playera' | 'camisa' | 'bermuda';
export type Talla = 'S' | 'M' | 'L' | 'XL';
export type Etiqueta = 'NUEVO' | 'ESENCIAL' | null;
export type Audiencia = 'hombre' | 'nino';
export type Color = 'negro' | 'azul' | 'gris' | 'beige' | 'blanco' | 'cafe';

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
}
