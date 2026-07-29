import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EstadoPedido, Pedido } from '../models/pedido.model';

const CLAVE_PEDIDOS = 'pedidos_data';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private pedidos: Pedido[] = this.leerPedidosGuardados();

  crearPedido(datos: Omit<Pedido, 'id' | 'estado' | 'fecha'>): Observable<Pedido> {
    const nuevoPedido: Pedido = {
      ...datos,
      id: crypto.randomUUID(),
      estado: 'pendiente',
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

  actualizarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    this.pedidos = this.pedidos.map(pedido => (pedido.id === id ? { ...pedido, estado } : pedido));
    this.guardarPedidos();

    const actualizado = this.pedidos.find(pedido => pedido.id === id);
    return of(actualizado as Pedido);
  }

  private guardarPedidos(): void {
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(this.pedidos));
  }

  private leerPedidosGuardados(): Pedido[] {
    const guardados = localStorage.getItem(CLAVE_PEDIDOS);
    return guardados ? (JSON.parse(guardados) as Pedido[]) : [];
  }
}
