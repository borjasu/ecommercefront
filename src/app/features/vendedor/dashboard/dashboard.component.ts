import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../../core/services/producto.service';
import { VendorPedidoService } from '../../../core/services/vendor-pedido.service';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';

@Component({
    selector: 'app-dashboard',
    imports: [DatePipe, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly productoService = inject(ProductoService);
  private readonly vendorPedidoService = inject(VendorPedidoService);

  readonly totalProductos = signal(0);
  readonly pedidos = signal<Pedido[]>([]);

  readonly totalPedidos = computed(() => this.pedidos().length);

  readonly pedidosPendientes = computed(
    () => this.pedidos().filter(pedido => pedido.estado === 'pendiente').length
  );

  readonly ingresosTotales = computed(() =>
    this.pedidos()
      .filter(pedido => pedido.estado !== 'cancelado')
      .reduce((total, pedido) => total + pedido.total, 0)
  );

  readonly pedidosRecientes = computed(() =>
    [...this.pedidos()]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5)
  );

  constructor() {
    this.productoService.obtenerTodos().subscribe(productos => this.totalProductos.set(productos.length));
    this.vendorPedidoService.obtenerTodos().subscribe(pedidos => this.pedidos.set(pedidos));
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
}
