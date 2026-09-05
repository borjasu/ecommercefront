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
  PedidoDetalle
} from '../models/pedido.model';
import { Color, Talla } from '../models/producto.model';

export interface ItemPedidoPayload {
  productoId: string;
  talla: Talla;
  color: Color;
  cantidad: number;
}

export interface DatosFiscalesPayload {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
}

export interface CrearPedidoPayload {
  items: ItemPedidoPayload[];
  direccionId: string;
  cotizacionId: string;
  rateId: string;
  metodoPago: 'tarjeta' | 'efectivo';
  datosFiscales?: DatosFiscalesPayload;
}

// Forma real de la respuesta del backend (ver entities/pedido.entity.ts,
// item-pedido.entity.ts de ecommerceback). `items[].producto` es la entidad
// Producto cruda (relations: {items: {producto: true}}), no el
// ProductoConPrecio que usa el catálogo — aquí solo se necesitan
// nombre/imagenUrl para mostrar el pedido, el precio real ya vive en
// `precioUnitario` (snapshot al momento de comprar).
interface ItemPedidoBackend {
  productoId: string;
  // Presente en GET /pedidos y GET /pedidos/:id (relations: {items: {producto:
  // true}}) — AUSENTE en la respuesta de POST /pedidos (OrdersService.crear
  // guarda la entidad y la regresa tal cual, sin volver a cargar relaciones).
  // Verificado en vivo contra el backend real, no es un supuesto.
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

// Lado comprador de pedidos contra el backend real — deliberadamente separado
// de PedidoService (el mock que sigue usando hoy el panel de vendedor: ver
// nota en pedido.model.ts). Habla con OrdersController (/pedidos), que ya
// viene scopeado al usuario autenticado (GET /pedidos nunca devuelve pedidos
// de alguien más — anti-IDOR del lado del backend).
@Injectable({
  providedIn: 'root'
})
export class PedidoCompradorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pedidos`;

  crear(payload: CrearPedidoPayload): Observable<PedidoDetalle> {
    return this.http
      .post<PedidoBackend>(this.baseUrl, payload, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoDetalle(pedido)));
  }

  obtenerMisPedidos(): Observable<PedidoDetalle[]> {
    return this.http
      .get<PedidoBackend[]>(this.baseUrl, { withCredentials: true })
      .pipe(map(pedidos => pedidos.map(pedido => this.aPedidoDetalle(pedido))));
  }

  obtenerPorId(id: string): Observable<PedidoDetalle> {
    return this.http
      .get<PedidoBackend>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(pedido => this.aPedidoDetalle(pedido)));
  }

  private aPedidoDetalle(p: PedidoBackend): PedidoDetalle {
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
      fecha: p.fecha
    };
  }
}
