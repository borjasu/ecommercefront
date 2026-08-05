import { ItemCarrito } from './carrito.model';
import { DetalleStockInsuficiente } from './producto.model';

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

// PedidoService.crearPedido ahora valida stock por variante antes de crear el
// pedido (ver ProductoService.verificarStockDisponible); si falta stock no
// crea el pedido y regresa el detalle en vez de lanzar un pedido inválido.
export type ResultadoCrearPedido =
  | { ok: true; pedido: Pedido }
  | { ok: false; detalles: DetalleStockInsuficiente[] };
