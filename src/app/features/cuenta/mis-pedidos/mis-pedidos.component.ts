import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../../core/services/pedido.service';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';

@Component({
    selector: 'app-mis-pedidos',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-pedidos.component.html'
})
export class MisPedidosComponent {
  private readonly pedidoService = inject(PedidoService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);

  constructor() {
    this.cargar();
  }

  reintentar(): void {
    this.cargar();
  }

  toggleDetalle(pedido: Pedido): void {
    this.pedidoExpandidoId.update(id => (id === pedido.id ? null : pedido.id));
  }

  etiquetaEstado(estado: EstadoPedido): string {
    const etiquetas: Record<EstadoPedido, string> = {
      pendiente: 'Pendiente',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return etiquetas[estado];
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    // El backend ya filtra por el usuario de la cookie de sesión — nunca hace
    // falta (ni sería seguro) filtrar por email del lado del cliente.
    this.pedidoService.obtenerTodos().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }
}
