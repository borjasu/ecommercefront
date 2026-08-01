import { Injectable } from '@angular/core';
import { Color } from '../models/producto.model';

export interface ColorOpcion {
  valor: Color;
  etiqueta: string;
  hex: string;
}

// Debe coincidir exactamente con el enum `color_enum` de Postgres en el backend
// (src/entities/enums.ts) — el backend no soporta colores personalizados por
// vendedor todavía (requeriría migrar el enum fijo a una tabla con FK), así
// que por ahora la lista es fija en ambos lados.
const COLORES_BASE: ColorOpcion[] = [
  { valor: 'negro', etiqueta: 'Negro', hex: '#14110d' },
  { valor: 'azul', etiqueta: 'Azul', hex: '#2b3a55' },
  { valor: 'gris', etiqueta: 'Gris', hex: '#8a8a8a' },
  { valor: 'beige', etiqueta: 'Beige', hex: '#d9c9a3' },
  { valor: 'blanco', etiqueta: 'Blanco', hex: '#f5f5f0' },
  { valor: 'cafe', etiqueta: 'Café', hex: '#6b4226' }
];

@Injectable({
  providedIn: 'root'
})
export class ColoresService {
  readonly listado = () => COLORES_BASE;

  etiquetaDe(valor: Color): string {
    return COLORES_BASE.find(opcion => opcion.valor === valor)?.etiqueta ?? valor;
  }

  hexDe(valor: Color): string {
    return COLORES_BASE.find(opcion => opcion.valor === valor)?.hex ?? '#9c9c9c';
  }
}
