import { Audiencia, Categoria } from '../../core/models/producto.model';

export interface CategoriaOpcion {
  valor: Categoria;
  etiqueta: string;
}

export interface AudienciaOpcion {
  valor: Audiencia;
  etiqueta: string;
}

export const CATEGORIAS: CategoriaOpcion[] = [
  { valor: 'pantalon', etiqueta: 'Pantalón' },
  { valor: 'playera', etiqueta: 'Playera' },
  { valor: 'camisa', etiqueta: 'Camisa' },
  { valor: 'bermuda', etiqueta: 'Bermuda' }
];

export const AUDIENCIAS: AudienciaOpcion[] = [
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'nino', etiqueta: 'Niño' }
];
