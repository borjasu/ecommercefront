import { ItemCarrito } from './carrito.model';

export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado';
export type Paqueteria = 'DHL' | 'FedEx' | 'Estafeta' | 'Correos de México' | 'Otro';

export interface DatosEnvio {
  nombreCompleto: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
}

export interface InfoEnvio {
  paqueteria?: Paqueteria;
  numeroGuia?: string;
  urlRastreo?: string;
  fechaEnvio?: string;
}

export interface Pedido {
  id: string;
  numeroPedido: string;
  items: ItemCarrito[];
  total: number;
  datosEnvio: DatosEnvio;
  metodoPago: 'tarjeta' | 'efectivo';
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  infoEnvio?: InfoEnvio;
  fecha: string;
  emailComprador?: string;
}
