import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportesService } from '../../../core/services/reportes.service';
import { EstadoPedido, PedidoResumen } from '../../../core/models/pedido.model';
import { claseBadgeEstadoPedido, etiquetaEstadoPedido } from '../../../shared/utils/pedido-estado.util';

@Component({
    selector: 'app-dashboard',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly reportesService = inject(ReportesService);

  readonly cargando = signal(true);
  readonly error = signal(false);

  readonly totalProductos = signal(0);
  readonly totalPedidos = signal(0);
  readonly pedidosPendientes = signal(0);
  readonly ingresosTotales = signal(0);
  readonly pedidosRecientes = signal<PedidoResumen[]>([]);

  constructor() {
    this.cargarResumen();
  }

  reintentar(): void {
    this.cargarResumen();
  }

  etiquetaEstado(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  claseEstado(estado: EstadoPedido): string {
    return claseBadgeEstadoPedido(estado);
  }

  private cargarResumen(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.reportesService.dashboard().subscribe({
      next: resumen => {
        this.totalProductos.set(resumen.totalProductos);
        this.totalPedidos.set(resumen.totalPedidos);
        this.pedidosPendientes.set(resumen.pedidosPendientes);
        this.ingresosTotales.set(resumen.ingresosTotales);
        this.pedidosRecientes.set(resumen.pedidosRecientes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }
}
