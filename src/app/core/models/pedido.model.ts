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

export interface InfoEnvio {
  paqueteria: string | null;
  idEnvioSkydropx: string | null;
  numeroGuia: string | null;
  urlEtiqueta: string | null;
  urlRastreo: string | null;
  fechaEnvio: string | null;
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
  fecha: string;
}
