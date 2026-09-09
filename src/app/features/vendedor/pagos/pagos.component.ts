import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { VendorPedidoService } from '../../../core/services/vendor-pedido.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPago, Pedido } from '../../../core/models/pedido.model';
import { mensajeDeErrorHttp } from '../../../shared/utils/http-error.util';

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

  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly filtroActual = signal<FiltroEstadoPago>('todos');
  // Pedido cuyo reembolso se está confirmando en este momento — deshabilita
  // su botón mientras la petición está en curso, sin bloquear el resto de la
  // tabla.
  readonly reembolsandoId = signal<string | null>(null);

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

  reintentar(): void {
    this.cargarPedidos();
  }

  // MERGE: se descartó el <select> de origin/main que dejaba cambiar
  // estadoPago a cualquier valor a mano (pendiente/pagado/reembolsado) —
  // contradice su propio comentario de plantilla ("el estado lo confirma
  // Mercado Pago... de forma automática"). Se restauró el guardrail de HEAD:
  // pagado/pendiente los decide el webhook de Mercado Pago, la única
  // transición manual legítima es marcar un reembolso (ver
  // VendorPedidoService.marcarComoReembolsado, agregado sobre la base de
  // origin/main).
  marcarReembolsado(pedido: Pedido): void {
    this.reembolsandoId.set(pedido.id);
    this.vendorPedidoService.marcarComoReembolsado(pedido.id).subscribe({
      next: () => {
        this.reembolsandoId.set(null);
        this.cargarPedidos();
        this.toastService.exito(`Pedido "${pedido.numeroPedido}" marcado como reembolsado.`);
      },
      error: (error: HttpErrorResponse) => {
        this.reembolsandoId.set(null);
        this.toastService.error(mensajeDeErrorHttp(error));
      }
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
    this.cargando.set(true);
    this.error.set(false);
    this.vendorPedidoService.obtenerTodos().subscribe({
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
