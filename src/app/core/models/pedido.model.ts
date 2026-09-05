export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
// 'rechazado': Mercado Pago reportó el pago como rejected/cancelled (ver
// PaymentsService.verificarYActualizarPorPaymentId del backend) — distinto
// de 'pendiente', que sigue significando "todavía no se paga" (p. ej. un
// ticket OXXO en espera).
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado' | 'rechazado';

export interface DatosEnvio {
  nombreCompleto: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
}

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

// --- Pedido real del vendedor (PedidoVendedorService, día 4) ---------------
//
// Mismo pedido que ve el comprador, pero VendorOrdersController (a diferencia
// de OrdersController) puede ver y modificar cualquiera, y además carga la
// relación `usuario` (comprador dueño del pedido) que el lado comprador no
// necesita ver sobre sí mismo.
export interface PedidoVendedorDetalle {
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
  usuarioNombre: string;
  usuarioEmail: string;
}

// Forma mínima de GET /vendedor/dashboard → pedidosRecientes: esa consulta
// del backend (ReportsService.dashboard) no carga relations (items/usuario),
// solo las columnas planas del pedido — el dashboard tampoco las necesita
// (su tabla de "pedidos recientes" solo muestra número/fecha/total/estado).
export interface PedidoResumen {
  id: string;
  numeroPedido: string;
  fecha: string;
  total: number;
  estado: EstadoPedido;
}
