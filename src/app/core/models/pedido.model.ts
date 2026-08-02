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
  fecha: string;
}
