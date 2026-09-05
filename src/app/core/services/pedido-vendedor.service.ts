import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DatosEnvio,
  EstadoPago,
  EstadoPedido,
  InfoEnvioPedido,
  ItemPedidoDetalle,
  PedidoVendedorDetalle
} from '../models/pedido.model';

export interface FiltrosPedidosVendedor {
  estado?: EstadoPedido;
  estadoPago?: EstadoPago;
}

export interface RegistrarEnvioPayload {
  paqueteria: string;
  numeroGuia: string;
  urlRastreo?: string;
}

// Tope real que acepta el backend (ver ListarPedidosVendedorQueryDto,
// LIMITE_MAXIMO=200) — igual que con el catálogo de productos (día 2), este
// panel sigue pidiendo "todo de una vez" y filtrando/paginando en cliente
// (misma interacción que tenía el mock), así que se pide el máximo permitido
// en una sola llamada. Si el negocio llega a superar 200 pedidos hace falta
// agregar recorrido de páginas — no aplica todavía.
const LIMITE_PEDIDOS = 200;

interface UsuarioBackend {
  nombre: string;
  email: string;
}

// Misma forma que ItemPedidoBackend de pedido-comprador.service.ts —
// `producto` puede venir ausente (ver esa nota); no aplica aquí (todas las
// respuestas de VendorOrdersController sí cargan `items.producto`), pero se
// deja igual de defensivo por si acaso.
interface ItemPedidoBackend {
  productoId: string;
  producto?: { nombre: string; imagenUrl: string };
  talla: string;
  color: string;
  cantidad: number;
  precioUnitario: number;
}

interface PedidoBackend {
  id: string;
  numeroPedido: string;
  items: ItemPedidoBackend[];
  usuario: UsuarioBackend;
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

interface PaginaPedidosBackend {
  data: PedidoBackend[];
  total: number;
  page: number;
  limit: number;
}

// Lado vendedor de pedidos contra el backend real — separado de
// PedidoCompradorService (mismo criterio que el backend: VendorOrdersController
// vs OrdersController, ver auditoría del día 4). El vendedor ve y modifica
// CUALQUIER pedido, no solo los suyos.
@Injectable({
  providedIn: 'root'
})
export class PedidoVendedorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vendedor/pedidos`;

  listarTodos(filtros?: FiltrosPedidosVendedor): Observable<PedidoVendedorDetalle[]> {
    const params: Record<string, string | number> = { page: 1, limit: LIMITE_PEDIDOS };
    if (filtros?.estado) {
      params['estado'] = filtros.estado;
    }
    if (filtros?.estadoPago) {
      params['estadoPago'] = filtros.estadoPago;
    }

    return this.http
      .get<PaginaPedidosBackend>(this.baseUrl, { params, withCredentials: true })
      .pipe(map(pagina => pagina.data.map(pedido => this.aPedidoVendedor(pedido))));
  }

  obtenerUno(id: string): Observable<PedidoVendedorDetalle> {
    return this.http
      .get<PedidoBackend>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoVendedor(pedido)));
  }

  // "enviado" nunca se manda aquí (el backend lo rechaza a propósito, ver
  // VendorOrdersService.actualizarEstado) — se llega a "enviado" únicamente
  // vía registrarEnvioManual o generarGuiaAutomatica, nunca por este método.
  actualizarEstado(id: string, estado: EstadoPedido): Observable<PedidoVendedorDetalle> {
    return this.http
      .patch<PedidoBackend>(`${this.baseUrl}/${id}/estado`, { estado }, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoVendedor(pedido)));
  }

  registrarEnvioManual(id: string, payload: RegistrarEnvioPayload): Observable<PedidoVendedorDetalle> {
    return this.http
      .patch<PedidoBackend>(`${this.baseUrl}/${id}/envio`, payload, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoVendedor(pedido)));
  }

  // Cotiza y genera la guía real vía Skydropx (mismo criterio de tarifa que
  // el checkout del comprador) — sin captura manual.
  generarGuiaAutomatica(id: string): Observable<PedidoVendedorDetalle> {
    return this.http
      .post<PedidoBackend>(`${this.baseUrl}/${id}/generar-guia`, {}, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoVendedor(pedido)));
  }

  // Única transición de estadoPago que el vendedor puede aplicar a mano
  // (decisión del día 4): ningún webhook de Mercado Pago mueve nunca un
  // pedido a REEMBOLSADO, así que es la única razón legítima para tocar este
  // campo manualmente. A propósito NO existe un método genérico
  // "cambiarEstadoPago" — pagado/rechazado/pendiente los decide Mercado Pago
  // (ver PagoService), nunca el vendedor a mano.
  marcarComoReembolsado(id: string): Observable<PedidoVendedorDetalle> {
    return this.http
      .patch<PedidoBackend>(
        `${this.baseUrl}/${id}/estado-pago`,
        { estadoPago: 'reembolsado' },
        { withCredentials: true }
      )
      .pipe(map(pedido => this.aPedidoVendedor(pedido)));
  }

  private aPedidoVendedor(p: PedidoBackend): PedidoVendedorDetalle {
    const items: ItemPedidoDetalle[] = p.items.map(item => ({
      productoId: item.productoId,
      productoNombre: item.producto?.nombre ?? '',
      productoImagenUrl: item.producto?.imagenUrl ?? '',
      talla: item.talla,
      color: item.color,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario
    }));

    return {
      id: p.id,
      numeroPedido: p.numeroPedido,
      items,
      subtotal: p.subtotal,
      costoEnvio: p.costoEnvio,
      total: p.total,
      datosEnvio: p.datosEnvio,
      metodoPago: p.metodoPago,
      estado: p.estado,
      estadoPago: p.estadoPago,
      infoEnvio: p.infoEnvio,
      fecha: p.fecha,
      usuarioNombre: p.usuario?.nombre ?? '',
      usuarioEmail: p.usuario?.email ?? ''
    };
  }
}
