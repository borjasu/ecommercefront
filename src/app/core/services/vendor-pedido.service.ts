import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { EstadoPago, EstadoPedido, Pedido } from '../models/pedido.model';

export interface RegistrarEnvioManual {
  paqueteria: string;
  numeroGuia: string;
  urlRastreo?: string;
}

/** CRUD de pedidos del lado vendedor (/vendedor/pedidos) — ve y modifica cualquier pedido, a diferencia de PedidoService (comprador). */
@Injectable({
  providedIn: 'root'
})
export class VendorPedidoService {
  private readonly http = inject(HttpClient);

  obtenerTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_URL}/vendedor/pedidos`);
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
}
