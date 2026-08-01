import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PedidoService } from '../../../core/services/pedido.service';
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
  private readonly pedidoService = inject(PedidoService);

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

  constructor() {
    this.cargarPedidos();
  }

  cambiarEstadoPago(pedido: Pedido, estadoPago: EstadoPago): void {
    this.pedidoService.actualizarEstadoPago(pedido.id, estadoPago).subscribe(() => this.cargarPedidos());
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
    this.pedidoService.obtenerTodos().subscribe(pedidos => this.pedidos.set(pedidos));
  }
}
