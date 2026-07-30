import { Color } from '../../core/models/producto.model';

export interface ColorOpcion {
  valor: Color;
  etiqueta: string;
  hex: string;
}

export const COLORES: ColorOpcion[] = [
  { valor: 'negro', etiqueta: 'Negro', hex: '#14110d' },
  { valor: 'azul', etiqueta: 'Azul', hex: '#2b3a55' },
  { valor: 'gris', etiqueta: 'Gris', hex: '#8a8a8a' },
  { valor: 'beige', etiqueta: 'Beige', hex: '#d9c9a3' },
  { valor: 'blanco', etiqueta: 'Blanco', hex: '#f5f5f0' },
  { valor: 'cafe', etiqueta: 'Café', hex: '#6b4226' }
];
