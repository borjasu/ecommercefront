import { Audiencia, Categoria } from './producto.model';

export type TipoDescuento = 'porcentaje' | 'monto_fijo';
export type AplicaA = 'producto' | 'categoria' | 'audiencia';

export interface Oferta {
  id: string;
  nombre: string;
  tipoDescuento: TipoDescuento;
  valor: number;
  aplicaA: AplicaA;
  productoId: string | null;
  categoria: Categoria | null;
  audiencia: Audiencia | null;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}
