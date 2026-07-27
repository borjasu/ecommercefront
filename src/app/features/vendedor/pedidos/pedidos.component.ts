import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PedidoService } from '../../../core/services/pedido.service';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';

type FiltroEstado = 'todos' | EstadoPedido;

interface FiltroOpcion {
  valor: FiltroEstado;
  etiqueta: string;
}

@Component({
    selector: 'app-pedidos',
    imports: [DatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './pedidos.component.html'
})
export class PedidosComponent {
  private readonly pedidoService = inject(PedidoService);

  readonly filtros: FiltroOpcion[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendiente' },
    { valor: 'enviado', etiqueta: 'Enviado' },
    { valor: 'entregado', etiqueta: 'Entregado' },
    { valor: 'cancelado', etiqueta: 'Cancelado' }
  ];

  readonly estados: EstadoPedido[] = ['pendiente', 'enviado', 'entregado', 'cancelado'];

  readonly pedidos = signal<Pedido[]>([]);
  readonly filtroActual = signal<FiltroEstado>('todos');
  readonly pedidoExpandidoId = signal<string | null>(null);

  readonly pedidosOrdenados = computed(() =>
    [...this.pedidos()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  );

  readonly pedidosFiltrados = computed(() => {
    const filtro = this.filtroActual();
    const pedidos = this.pedidosOrdenados();
    return filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.estado === filtro);
  });

  constructor() {
    this.cargarPedidos();
  }

  toggleDetalle(pedido: Pedido): void {
    this.pedidoExpandidoId.update(id => (id === pedido.id ? null : pedido.id));
  }

  cambiarEstado(pedido: Pedido, estado: EstadoPedido): void {
    this.pedidoService.actualizarEstado(pedido.id, estado).subscribe(() => this.cargarPedidos());
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

  private cargarPedidos(): void {
    this.pedidoService.obtenerTodos().subscribe(pedidos => this.pedidos.set(pedidos));
  }
}
