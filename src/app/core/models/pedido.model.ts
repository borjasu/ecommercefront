import { ItemCarrito } from './carrito.model';

export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';

export interface DatosEnvio {
  nombreCompleto: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
}

export interface Pedido {
  id: string;
  numeroPedido: string;
  items: ItemCarrito[];
  total: number;
  datosEnvio: DatosEnvio;
  metodoPago: 'tarjeta' | 'efectivo';
  estado: EstadoPedido;
  fecha: string;
  emailComprador?: string;
}
