import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EstadoPago, EstadoPedido, InfoEnvio, Pedido } from '../models/pedido.model';

const CLAVE_PEDIDOS = 'pedidos_data';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private pedidos: Pedido[] = this.leerPedidosGuardados();

  crearPedido(datos: Omit<Pedido, 'id' | 'estado' | 'estadoPago' | 'fecha'>): Observable<Pedido> {
    const nuevoPedido: Pedido = {
      ...datos,
      id: crypto.randomUUID(),
      estado: 'pendiente',
      estadoPago: 'pendiente',
      fecha: new Date().toISOString()
    };

    this.pedidos = [...this.pedidos, nuevoPedido];
    this.guardarPedidos();

    return of(nuevoPedido);
  }

  obtenerTodos(): Observable<Pedido[]> {
    return of(this.pedidos);
  }

  obtenerPorId(id: string): Observable<Pedido | undefined> {
    return of(this.pedidos.find(pedido => pedido.id === id));
  }

  actualizarEstado(id: string, estado: EstadoPedido, infoEnvio?: InfoEnvio): Observable<Pedido> {
    this.pedidos = this.pedidos.map(pedido =>
      pedido.id === id
        ? { ...pedido, estado, ...(infoEnvio ? { infoEnvio: { ...pedido.infoEnvio, ...infoEnvio } } : {}) }
        : pedido
    );
    this.guardarPedidos();

    const actualizado = this.pedidos.find(pedido => pedido.id === id);
    return of(actualizado as Pedido);
  }

  actualizarEstadoPago(id: string, estadoPago: EstadoPago): Observable<Pedido> {
    this.pedidos = this.pedidos.map(pedido => (pedido.id === id ? { ...pedido, estadoPago } : pedido));
    this.guardarPedidos();

    const actualizado = this.pedidos.find(pedido => pedido.id === id);
    return of(actualizado as Pedido);
  }

  private guardarPedidos(): void {
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(this.pedidos));
  }

  private leerPedidosGuardados(): Pedido[] {
    const guardados = localStorage.getItem(CLAVE_PEDIDOS);

    if (!guardados) {
      return [];
    }

    const pedidos = (JSON.parse(guardados) as Partial<Pedido>[]).map(
      pedido =>
        ({
          estadoPago: 'pendiente' as EstadoPago,
          ...pedido
        }) as Pedido
    );
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos));
    return pedidos;
  }
}
