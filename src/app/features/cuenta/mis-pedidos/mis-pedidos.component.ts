import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { delay } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';
import { claseBadgeEstadoPedido, etiquetaEstadoPedido } from '../../../shared/utils/pedido-estado.util';

const RETRASO_CARGA_MS = 400;

@Component({
    selector: 'app-mis-pedidos',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-pedidos.component.html'
})
export class MisPedidosComponent {
  private readonly authService = inject(AuthService);
  private readonly pedidoService = inject(PedidoService);

  private readonly todosLosPedidos = signal<Pedido[]>([]);
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly cargando = signal(true);

  readonly pedidos = computed(() => {
    const email = this.authService.currentUser()?.email;
    return this.todosLosPedidos()
      .filter(pedido => pedido.emailComprador === email)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  });

  constructor() {
    this.pedidoService
      .obtenerTodos()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe(pedidos => {
        this.todosLosPedidos.set(pedidos);
        this.cargando.set(false);
      });
  }

  toggleDetalle(pedido: Pedido): void {
    this.pedidoExpandidoId.update(id => (id === pedido.id ? null : pedido.id));
  }

  etiquetaEstado(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  claseEstado(estado: EstadoPedido): string {
    return claseBadgeEstadoPedido(estado);
  }
}
