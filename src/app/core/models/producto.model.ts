export type Categoria = 'pantalon' | 'playera' | 'camisa' | 'bermuda';
export type Talla = 'S' | 'M' | 'L' | 'XL';
export type Etiqueta = 'NUEVO' | 'ESENCIAL' | null;

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Categoria;
  tallasDisponibles: Talla[];
  imagenUrl: string;
  etiqueta?: Etiqueta;
}
