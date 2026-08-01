import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PedidoService } from '../../../core/services/pedido.service';
import { EstadoPago, EstadoPedido, Paqueteria, Pedido } from '../../../core/models/pedido.model';

type FiltroEstado = 'todos' | EstadoPedido;

interface FiltroOpcion {
  valor: FiltroEstado;
  etiqueta: string;
}

const PAQUETERIAS: Paqueteria[] = ['DHL', 'FedEx', 'Estafeta', 'Correos de México', 'Otro'];

@Component({
    selector: 'app-pedidos',
    imports: [DatePipe, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './pedidos.component.html'
})
export class PedidosComponent {
  private readonly pedidoService = inject(PedidoService);
  private readonly fb = inject(FormBuilder);

  readonly filtros: FiltroOpcion[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendiente' },
    { valor: 'enviado', etiqueta: 'Enviado' },
    { valor: 'entregado', etiqueta: 'Entregado' },
    { valor: 'cancelado', etiqueta: 'Cancelado' }
  ];

  readonly estados: EstadoPedido[] = ['pendiente', 'enviado', 'entregado', 'cancelado'];
  readonly paqueterias = PAQUETERIAS;

  readonly pedidos = signal<Pedido[]>([]);
  readonly filtroActual = signal<FiltroEstado>('todos');
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly pedidoPendienteGuia = signal<Pedido | null>(null);

  readonly guiaForm = this.fb.group({
    paqueteria: ['DHL' as Paqueteria, [Validators.required]],
    numeroGuia: ['', [Validators.required]],
    urlRastreo: ['']
  });

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
    if (estado === 'enviado' && !pedido.infoEnvio?.numeroGuia) {
      this.guiaForm.reset({ paqueteria: 'DHL', numeroGuia: '', urlRastreo: '' });
      this.pedidoPendienteGuia.set(pedido);
      return;
    }

    this.pedidoService.actualizarEstado(pedido.id, estado).subscribe(() => this.cargarPedidos());
  }

  confirmarGuia(): void {
    const pedido = this.pedidoPendienteGuia();
    if (!pedido || this.guiaForm.invalid) {
      this.guiaForm.markAllAsTouched();
      return;
    }

    const { paqueteria, numeroGuia, urlRastreo } = this.guiaForm.getRawValue();

    this.pedidoService
      .actualizarEstado(pedido.id, 'enviado', {
        paqueteria: paqueteria as Paqueteria,
        numeroGuia: numeroGuia!,
        urlRastreo: urlRastreo || undefined,
        fechaEnvio: new Date().toISOString()
      })
      .subscribe(() => {
        this.cargarPedidos();
        this.pedidoPendienteGuia.set(null);
      });
  }

  cancelarGuia(): void {
    this.pedidoPendienteGuia.set(null);
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
