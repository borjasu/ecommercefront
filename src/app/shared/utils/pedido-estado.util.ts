import { EstadoPago, EstadoPedido } from '../../core/models/pedido.model';

const ETIQUETAS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};

// Mismo lenguaje visual que `.badge` (rounded-[2px], texto uppercase xs) pero
// con un color por estado en vez del dorado fijo: así el chip comunica el
// estado de un vistazo (ámbar = en espera, azul = en tránsito, verde =
// completado, rojo = cancelado) tanto en "Mis pedidos" del comprador como en
// "Pedidos"/dashboard del vendedor.
const CLASES_BASE =
  'inline-block rounded-[2px] px-2 py-1 font-body text-xs font-semibold uppercase tracking-wider';

const CLASES_POR_ESTADO: Record<EstadoPedido, string> = {
  pendiente: `${CLASES_BASE} bg-amber-100 text-amber-800`,
  enviado: `${CLASES_BASE} bg-blue-100 text-blue-800`,
  entregado: `${CLASES_BASE} bg-green-100 text-green-800`,
  cancelado: `${CLASES_BASE} bg-red-100 text-red-800`
};

export function etiquetaEstadoPedido(estado: EstadoPedido): string {
  return ETIQUETAS[estado];
}

export function claseBadgeEstadoPedido(estado: EstadoPedido): string {
  return CLASES_POR_ESTADO[estado];
}

// Estado de PAGO (pendiente/pagado/reembolsado/rechazado) — eje distinto al
// de arriba (envío/entrega). "rechazado" SÍ es un valor real y persistido de
// EstadoPago (ver PaymentsService.verificarYActualizarPorPaymentId del
// backend): antes un pago que Mercado Pago rechazaba se guardaba como
// "pendiente", indistinguible de un pago legítimamente en espera (p. ej.
// ticket OXXO sin pagar todavía) — ahora tiene su propio estado y badge, en
// rojo/oxide para que el vendedor lo distinga de un vistazo del ámbar de
// "pendiente".
const ETIQUETAS_PAGO: Record<EstadoPago, string> = {
  pendiente: 'Pago pendiente',
  pagado: 'Pagado',
  reembolsado: 'Reembolsado',
  rechazado: 'Pago rechazado'
};

const CLASES_POR_ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente: `${CLASES_BASE} bg-amber-100 text-amber-800`,
  pagado: `${CLASES_BASE} bg-green-100 text-green-800`,
  reembolsado: `${CLASES_BASE} bg-blue-100 text-blue-800`,
  rechazado: `${CLASES_BASE} bg-red-100 text-red-800`
};

export function etiquetaEstadoPago(estado: EstadoPago): string {
  return ETIQUETAS_PAGO[estado];
}

export function claseBadgeEstadoPago(estado: EstadoPago): string {
  return CLASES_POR_ESTADO_PAGO[estado];
}
