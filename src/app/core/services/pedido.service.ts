import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { MetodoPago, Pedido } from '../models/pedido.model';
import { ItemParaCotizar } from '../models/envio.model';

export interface CrearPedidoRequest {
  items: ItemParaCotizar[];
  direccionId: string;
  cotizacionId: string;
  rateId: string;
  metodoPago: MetodoPago;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly http = inject(HttpClient);

  crearPedido(datos: CrearPedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(`${API_URL}/pedidos`, datos);
  }

  obtenerTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_URL}/pedidos`);
  }

  obtenerPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${API_URL}/pedidos/${id}`);
  }

  /**
   * Respaldo bajo demanda del rastreo (por si el webhook de Skydropx no llega
   * o no está configurado): consulta contra Skydropx en vivo y devuelve el
   * estado actualizado.
   */
  obtenerRastreo(id: string): Observable<{ trackingStatus: string | null }> {
    return this.http.get<{ trackingStatus: string | null }>(`${API_URL}/pedidos/${id}/rastreo`);
  }
}
