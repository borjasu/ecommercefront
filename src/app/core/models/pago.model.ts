export type ResultadoPago = 'aprobado' | 'pendiente' | 'rechazado';

export interface RespuestaPreferencia {
  preferenceId: string;
  amount: number;
}
