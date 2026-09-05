import { ItemCarrito } from './carrito.model';
import { DetalleStockInsuficiente } from './producto.model';

export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
// 'rechazado': Mercado Pago reportó el pago como rejected/cancelled (ver
// PaymentsService.verificarYActualizarPorPaymentId del backend) — distinto
// de 'pendiente', que sigue significando "todavía no se paga" (p. ej. un
// ticket OXXO en espera).
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado' | 'rechazado';
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

// --- Pedido real del comprador (PedidoCompradorService) ---------------------
//
// Tipos separados de `Pedido`/`InfoEnvio` de arriba a propósito: esos siguen
// siendo el modelo 100% mock que usa hoy el panel de vendedor (dashboard,
// pedidos, reportes, pagos — ver PedidoService), sin tocar. El backend real
// (ecommerceback) separa igual de tajante "pedidos del comprador"
// (OrdersController) de "pedidos del vendedor" (VendorOrdersController, con
// su propia paginación/filtros) — conectar ese segundo lado es trabajo de
// otro día, así que este archivo por ahora solo cubre el primero.

// Snapshot de la línea tal como quedó al comprar: precioUnitario es el precio
// FINAL ya cobrado (con oferta aplicada si la había), nunca se recalcula con
// el precio actual del producto — ver ItemPedido.entity.ts del backend.
export interface ItemPedidoDetalle {
  productoId: string;
  productoNombre: string;
  productoImagenUrl: string;
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario: number;
}

export interface InfoEnvioPedido {
  paqueteria: string | null;
  numeroGuia: string | null;
  urlEtiqueta: string | null;
  urlRastreo: string | null;
  trackingStatus: string | null;
}

export interface PedidoDetalle {
  id: string;
  numeroPedido: string;
  items: ItemPedidoDetalle[];
  subtotal: number;
  costoEnvio: number;
  total: number;
  datosEnvio: DatosEnvio;
  metodoPago: 'tarjeta' | 'efectivo';
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  infoEnvio: InfoEnvioPedido;
  fecha: string;
}
