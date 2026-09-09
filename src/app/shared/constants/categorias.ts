import { Audiencia } from '../../core/models/producto.model';

// Las categorías ya NO son una lista fija — son un catálogo dinámico con CRUD
// propio (ver CategoriasService.listado), mismo criterio que Color/Talla. Este
// archivo se queda solo con Audiencia, que sigue siendo un valor fijo de
// verdad (no tiene CRUD ni el prompt lo pidió dinámico).
export interface AudienciaOpcion {
  valor: Audiencia;
  etiqueta: string;
}

export const AUDIENCIAS: AudienciaOpcion[] = [
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'nino', etiqueta: 'Niño' }
];
