export interface DatosTarjeta {
  numero: string;
  nombreTitular: string;
  mesVencimiento: string;
  anioVencimiento: string;
  cvv: string;
}

export type ResultadoPago = 'aprobado' | 'pendiente' | 'rechazado';
