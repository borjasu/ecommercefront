import { Color, Producto, Talla } from './producto.model';

export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado';
export type MetodoPago = 'tarjeta' | 'efectivo';

export interface DatosEnvio {
  nombreCompleto: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
}

// Texto libre tal como lo manda Skydropx (created/picked_up/in_transit/...) —
// ver InfoEnvio.trackingStatus del lado backend para el porqué no es un
// union type cerrado: no hay documentación oficial confirmada con la lista
// completa y exacta de valores.
export type EstadoRastreo = string;

export interface InfoEnvio {
  paqueteria: string | null;
  idEnvioSkydropx: string | null;
  numeroGuia: string | null;
  urlEtiqueta: string | null;
  urlRastreo: string | null;
  fechaEnvio: string | null;
  trackingStatus: EstadoRastreo | null;
}

// Todo nullable: la factura fiscal es opcional, un pedido sin factura no
// tiene ninguno de estos tres datos.
export interface DatosFiscales {
  rfc: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
}

export interface ItemPedido {
  id: string;
  productoId: string;
  producto: Producto;
  talla: Talla;
  color: Color;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  numeroPedido: string;
  usuarioId: string;
  // Solo viene poblado en las respuestas del lado vendedor (/vendedor/pedidos).
  usuario?: { id: string; nombre: string; email: string };
  items: ItemPedido[];
  subtotal: number;
  costoEnvio: number;
  total: number;
  datosEnvio: DatosEnvio;
  metodoPago: MetodoPago;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  infoEnvio: InfoEnvio;
  datosFiscales: DatosFiscales;
  // true si el job de limpieza lo canceló por nunca pagarse (no una
  // cancelación manual del vendedor) — ver OrdersCleanupService en el backend.
  canceladoPorAbandono: boolean;
  fecha: string;
}

// MERGE: agregado sobre la base de origin/main (no existía ahí). Forma
// mínima de GET /vendedor/dashboard → pedidosRecientes: esa consulta del
// backend (ReportsService.dashboard, ver reportes.service.ts) no carga
// relations (items/usuario), solo las columnas planas del pedido — el
// dashboard tampoco las necesita (su tabla de "pedidos recientes" solo
// muestra número/fecha/total/estado). Se conservó porque
// dashboard.component.ts usa el resumen calculado por el backend
// (ReportesService) en vez de derivarlo en cliente de VendorPedidoService,
// que trunca a 200 pedidos (ver vendor-pedido.service.ts) y daría cifras
// incorrectas de ingresosTotales/totalPedidos pasado ese tope.
export interface PedidoResumen {
  id: string;
  numeroPedido: string;
  fecha: string;
  total: number;
  estado: EstadoPedido;
}
