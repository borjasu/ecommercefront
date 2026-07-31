import { Audiencia, Categoria } from './producto.model';

export type TipoDescuento = 'porcentaje' | 'monto_fijo';

export interface Oferta {
  id: string;
  nombre: string;
  tipoDescuento: TipoDescuento;
  valorDescuento: number;
  productosAplicables: string[]; // ids de producto, vacío = aplica a toda la categoría/audiencia indicada
  categoriaAplicable?: Categoria;
  audienciaAplicable?: Audiencia;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}
