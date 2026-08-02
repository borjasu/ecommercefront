import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VendorPedidoService } from '../../../core/services/vendor-pedido.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPago, Pedido } from '../../../core/models/pedido.model';

type FiltroEstadoPago = 'todos' | EstadoPago;

interface FiltroOpcion {
  valor: FiltroEstadoPago;
  etiqueta: string;
}

@Component({
    selector: 'app-pagos',
    imports: [DatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './pagos.component.html'
})
export class PagosComponent {
  private readonly vendorPedidoService = inject(VendorPedidoService);
  private readonly toastService = inject(ToastService);

  readonly filtros: FiltroOpcion[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendiente' },
    { valor: 'pagado', etiqueta: 'Pagado' },
    { valor: 'reembolsado', etiqueta: 'Reembolsado' }
  ];

  readonly estadosPago: EstadoPago[] = ['pendiente', 'pagado', 'reembolsado'];

  readonly pedidos = signal<Pedido[]>([]);
  readonly filtroActual = signal<FiltroEstadoPago>('todos');

  readonly pedidosOrdenados = computed(() =>
    [...this.pedidos()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  );

  readonly pedidosFiltrados = computed(() => {
    const filtro = this.filtroActual();
    const pedidos = this.pedidosOrdenados();
    return filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.estadoPago === filtro);
  });

  // Dinero real vs. solo referencia: totalPagado es la ÚNICA cifra que suma
  // montos (nunca incluye pendiente/reembolsado) — pendientesCount y
  // reembolsadosCount son conteos de pedidos, no dinero, para no dar la
  // impresión de que ese monto ya entró a caja.
  readonly totalPagado = computed(
    () =>
      Math.round(
        this.pedidos()
          .filter(pedido => pedido.estadoPago === 'pagado')
          .reduce((suma, pedido) => suma + pedido.total, 0) * 100
      ) / 100
  );

  readonly pendientesCount = computed(() => this.pedidos().filter(pedido => pedido.estadoPago === 'pendiente').length);
  readonly reembolsadosCount = computed(
    () => this.pedidos().filter(pedido => pedido.estadoPago === 'reembolsado').length
  );

  constructor() {
    this.cargarPedidos();
  }

  cambiarEstadoPago(pedido: Pedido, estadoPago: EstadoPago): void {
    this.vendorPedidoService.actualizarEstadoPago(pedido.id, estadoPago).subscribe({
      next: () => this.cargarPedidos(),
      error: () => this.toastService.error('No pudimos actualizar el estado de pago.')
    });
  }

  etiquetaEstadoPago(estadoPago: EstadoPago): string {
    const etiquetas: Record<EstadoPago, string> = {
      pendiente: 'Pendiente',
      pagado: 'Pagado',
      reembolsado: 'Reembolsado'
    };
    return etiquetas[estadoPago];
  }

  private cargarPedidos(): void {
    this.vendorPedidoService.obtenerTodos().subscribe({
      next: pedidos => this.pedidos.set(pedidos),
      error: () => this.toastService.error('No pudimos cargar los pedidos.')
    });
  }
}
