import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from '../config/api.config';
import { EstadoPago, EstadoPedido, Pedido } from '../models/pedido.model';

export interface RegistrarEnvioManual {
  paqueteria: string;
  numeroGuia: string;
  urlRastreo?: string;
}

interface PaginaDePedidos {
  data: Pedido[];
  total: number;
  page: number;
  limit: number;
}

// Tope máximo que acepta el backend (ver ListarPedidosVendedorQueryDto). Se pide
// de una vez para preservar el comportamiento de "traer todos" que usan
// dashboard/reportes/pedidos/pagos, sin dejar la consulta realmente sin límite.
const LIMITE_MAXIMO_BACKEND = 200;

/** CRUD de pedidos del lado vendedor (/vendedor/pedidos) — ve y modifica cualquier pedido, a diferencia de PedidoService (comprador). */
@Injectable({
  providedIn: 'root'
})
export class VendorPedidoService {
  private readonly http = inject(HttpClient);

  /**
   * Por default el backend excluye los pedidos cancelados automáticamente por
   * abandono (nunca se pagaron, ver OrdersCleanupService) — no ensucian el
   * panel principal, dashboard, reportes ni pagos. Pasa soloAbandonados:true
   * únicamente para la pestaña dedicada que los muestra aparte.
   */
  obtenerTodos(soloAbandonados = false): Observable<Pedido[]> {
    let params = new HttpParams().set('limit', LIMITE_MAXIMO_BACKEND);
    if (soloAbandonados) {
      params = params.set('soloAbandonados', 'true');
    }
    return this.http
      .get<PaginaDePedidos>(`${API_URL}/vendedor/pedidos`, { params })
      .pipe(map(pagina => pagina.data));
  }

  obtenerPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${API_URL}/vendedor/pedidos/${id}`);
  }

  actualizarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API_URL}/vendedor/pedidos/${id}/estado`, { estado });
  }

  actualizarEstadoPago(id: string, estadoPago: EstadoPago): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API_URL}/vendedor/pedidos/${id}/estado-pago`, { estadoPago });
  }

  registrarEnvioManual(id: string, datos: RegistrarEnvioManual): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API_URL}/vendedor/pedidos/${id}/envio`, datos);
  }

  /** Cotiza en vivo con Skydropx y genera la guía automáticamente (sin captura manual). */
  generarGuiaAutomatica(id: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${API_URL}/vendedor/pedidos/${id}/generar-guia`, {});
  }

  /**
   * Respaldo bajo demanda del rastreo (por si el webhook de Skydropx no llega
   * o no está configurado) — mismo endpoint que usa el comprador
   * (GET /pedidos/:id/rastreo, no /vendedor/pedidos/...): el backend resuelve
   * el acceso por rol, el vendedor puede consultar cualquier pedido.
   */
  obtenerRastreo(id: string): Observable<{ trackingStatus: string | null }> {
    return this.http.get<{ trackingStatus: string | null }>(`${API_URL}/pedidos/${id}/rastreo`);
  }
}
