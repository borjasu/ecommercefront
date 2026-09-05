import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PedidoVendedorService } from '../../../core/services/pedido-vendedor.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPago, PedidoVendedorDetalle } from '../../../core/models/pedido.model';
import { claseBadgeEstadoPago, etiquetaEstadoPago } from '../../../shared/utils/pedido-estado.util';
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
  private readonly pedidoVendedorService = inject(PedidoVendedorService);
  private readonly toastService = inject(ToastService);

  readonly filtros: FiltroOpcion[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendiente' },
    { valor: 'pagado', etiqueta: 'Pagado' },
    { valor: 'rechazado', etiqueta: 'Rechazado' },
    { valor: 'reembolsado', etiqueta: 'Reembolsado' }
  ];

  readonly pedidos = signal<PedidoVendedorDetalle[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly filtroActual = signal<FiltroEstadoPago>('todos');
  // Pedido cuyo reembolso se está confirmando en este momento — deshabilita
  // su botón mientras la petición está en curso, sin bloquear el resto de la
  // tabla.
  readonly reembolsandoId = signal<string | null>(null);

  readonly pedidosFiltrados = computed(() => {
    const filtro = this.filtroActual();
    const pedidos = this.pedidos();
    return filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.estadoPago === filtro);
  });

  constructor() {
    this.cargarPedidos();
  }

  reintentar(): void {
    this.cargarPedidos();
  }

  // Único cambio manual permitido (ver auditoría del día 4): pagado/rechazado
  // los decide Mercado Pago vía webhook, nunca el vendedor a mano — la única
  // transición sin cobertura automática es marcar un reembolso.
  marcarReembolsado(pedido: PedidoVendedorDetalle): void {
    this.reembolsandoId.set(pedido.id);
    this.pedidoVendedorService.marcarComoReembolsado(pedido.id).subscribe({
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
    return etiquetaEstadoPago(estadoPago);
  }

  claseEstadoPago(estadoPago: EstadoPago): string {
    return claseBadgeEstadoPago(estadoPago);
  }

  private cargarPedidos(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.pedidoVendedorService.listarTodos().subscribe({
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
