import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VendorPedidoService } from '../../../core/services/vendor-pedido.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPago, EstadoPedido, Pedido } from '../../../core/models/pedido.model';
import { etiquetaDeRastreo } from '../../../shared/constants/rastreo';

type FiltroEstado = 'todos' | EstadoPedido;
type Paqueteria = 'DHL' | 'FedEx' | 'Estafeta' | 'Correos de México' | 'Otro';

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
  private readonly vendorPedidoService = inject(VendorPedidoService);
  private readonly toastService = inject(ToastService);
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
  // Vista aparte del filtro por estado: pedidos que el job de limpieza
  // canceló solo por nunca pagarse (nunca fueron pedidos reales) — el
  // backend ya los excluye de la vista principal por default.
  readonly vistaAbandonados = signal(false);
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly pedidoPendienteGuia = signal<Pedido | null>(null);
  readonly generandoGuia = signal(false);
  readonly actualizandoRastreoId = signal<string | null>(null);

  readonly guiaForm = this.fb.group({
    paqueteria: ['DHL' as Paqueteria, [Validators.required]],
    numeroGuia: ['', [Validators.required]],
    urlRastreo: ['']
  });

  readonly pedidosOrdenados = computed(() =>
    [...this.pedidos()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  );

  readonly pedidosFiltrados = computed(() => {
    // En la vista de abandonados todos son 'cancelado' por definición — el
    // filtro por estado no aplica ahí, solo en la vista principal.
    if (this.vistaAbandonados()) {
      return this.pedidosOrdenados();
    }
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

    this.vendorPedidoService.actualizarEstado(pedido.id, estado).subscribe({
      next: () => this.cargarPedidos(),
      error: () => this.toastService.error('No pudimos actualizar el estado del pedido.')
    });
  }

  confirmarGuia(): void {
    const pedido = this.pedidoPendienteGuia();
    if (!pedido || this.guiaForm.invalid) {
      this.guiaForm.markAllAsTouched();
      return;
    }

    const { paqueteria, numeroGuia, urlRastreo } = this.guiaForm.getRawValue();

    this.vendorPedidoService
      .registrarEnvioManual(pedido.id, {
        paqueteria: paqueteria!,
        numeroGuia: numeroGuia!,
        urlRastreo: urlRastreo || undefined
      })
      .subscribe({
        next: () => {
          this.cargarPedidos();
          this.pedidoPendienteGuia.set(null);
        },
        error: () => this.toastService.error('No pudimos registrar la guía. Verifica los datos.')
      });
  }

  generarGuiaAutomatica(): void {
    const pedido = this.pedidoPendienteGuia();
    if (!pedido) {
      return;
    }

    this.generandoGuia.set(true);
    this.vendorPedidoService.generarGuiaAutomatica(pedido.id).subscribe({
      next: () => {
        this.cargarPedidos();
        this.pedidoPendienteGuia.set(null);
        this.generandoGuia.set(false);
        this.toastService.exito('Guía generada automáticamente con la paquetería.');
      },
      error: () => {
        this.generandoGuia.set(false);
        this.toastService.error('No pudimos generar la guía automática. Captúrala manualmente.');
      }
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

  etiquetaRastreo(estado: string | null): string | null {
    return etiquetaDeRastreo(estado);
  }

  actualizarRastreo(pedido: Pedido): void {
    this.actualizandoRastreoId.set(pedido.id);
    this.vendorPedidoService.obtenerRastreo(pedido.id).subscribe({
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

  cambiarVista(abandonados: boolean): void {
    if (this.vistaAbandonados() === abandonados) {
      return;
    }
    this.vistaAbandonados.set(abandonados);
    this.filtroActual.set('todos');
    this.cargarPedidos();
  }

  private cargarPedidos(): void {
    this.vendorPedidoService.obtenerTodos(this.vistaAbandonados()).subscribe({
      next: pedidos => this.pedidos.set(pedidos),
      error: () => this.toastService.error('No pudimos cargar los pedidos.')
    });
  }
}
