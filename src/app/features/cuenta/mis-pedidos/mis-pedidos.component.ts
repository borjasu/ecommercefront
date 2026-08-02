import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../../core/services/pedido.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';
import { etiquetaDeRastreo } from '../../../shared/constants/rastreo';

@Component({
    selector: 'app-mis-pedidos',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-pedidos.component.html'
})
export class MisPedidosComponent {
  private readonly pedidoService = inject(PedidoService);
  private readonly toastService = inject(ToastService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly actualizandoRastreoId = signal<string | null>(null);

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

  etiquetaRastreo(estado: string | null): string | null {
    return etiquetaDeRastreo(estado);
  }

  actualizarRastreo(pedido: Pedido): void {
    this.actualizandoRastreoId.set(pedido.id);
    this.pedidoService.obtenerRastreo(pedido.id).subscribe({
      next: ({ trackingStatus }) => {
        this.pedidos.update(lista =>
          lista.map(p => (p.id === pedido.id ? { ...p, infoEnvio: { ...p.infoEnvio, trackingStatus } } : p))
        );
        this.actualizandoRastreoId.set(null);
      },
      error: () => {
        this.toastService.error('No pudimos actualizar el rastreo. Intenta de nuevo.');
        this.actualizandoRastreoId.set(null);
      }
    });
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
