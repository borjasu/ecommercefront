import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PedidoCompradorService } from '../../../core/services/pedido-comprador.service';
import { EstadoPago, EstadoPedido, PedidoDetalle } from '../../../core/models/pedido.model';
import {
  claseBadgeEstadoPago,
  claseBadgeEstadoPedido,
  etiquetaEstadoPago,
  etiquetaEstadoPedido
} from '../../../shared/utils/pedido-estado.util';

@Component({
    selector: 'app-mis-pedidos',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-pedidos.component.html'
})
export class MisPedidosComponent {
  private readonly pedidoCompradorService = inject(PedidoCompradorService);

  private readonly todosLosPedidos = signal<PedidoDetalle[]>([]);
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);

  // GET /pedidos ya viene scopeado al usuario autenticado (OrdersController
  // del backend) — a diferencia de la versión mock, aquí no hace falta
  // filtrar por email en el cliente.
  readonly pedidos = computed(() =>
    [...this.todosLosPedidos()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  );

  constructor() {
    this.cargarPedidos();
  }

  reintentar(): void {
    this.cargarPedidos();
  }

  toggleDetalle(pedido: PedidoDetalle): void {
    this.pedidoExpandidoId.update(id => (id === pedido.id ? null : pedido.id));
  }

  etiquetaEstado(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  claseEstado(estado: EstadoPedido): string {
    return claseBadgeEstadoPedido(estado);
  }

  etiquetaPago(estado: EstadoPago): string {
    return etiquetaEstadoPago(estado);
  }

  clasePago(estado: EstadoPago): string {
    return claseBadgeEstadoPago(estado);
  }

  private cargarPedidos(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.pedidoCompradorService.obtenerMisPedidos().subscribe({
      next: pedidos => {
        this.todosLosPedidos.set(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }
}
