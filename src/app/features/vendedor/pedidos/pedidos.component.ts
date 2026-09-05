import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PedidoVendedorService } from '../../../core/services/pedido-vendedor.service';
import { ToastService } from '../../../core/services/toast.service';
import { EstadoPago, EstadoPedido, PedidoVendedorDetalle } from '../../../core/models/pedido.model';
import { claseBadgeEstadoPago, claseBadgeEstadoPedido, etiquetaEstadoPago, etiquetaEstadoPedido } from '../../../shared/utils/pedido-estado.util';
import { mensajeDeErrorHttp } from '../../../shared/utils/http-error.util';

type FiltroEstado = 'todos' | EstadoPedido;

interface FiltroOpcion {
  valor: FiltroEstado;
  etiqueta: string;
}

// Lista de referencia para el formulario de captura manual — el backend
// (RegistrarEnvioDto.paqueteria) acepta cualquier texto libre, esta lista
// solo ayuda a no escribir el nombre a mano en el caso común.
const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'Correos de México', 'Otro'];

@Component({
    selector: 'app-pedidos',
    imports: [DatePipe, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './pedidos.component.html'
})
export class PedidosComponent {
  private readonly pedidoVendedorService = inject(PedidoVendedorService);
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

  readonly pedidos = signal<PedidoVendedorDetalle[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly filtroActual = signal<FiltroEstado>('todos');
  readonly pedidoExpandidoId = signal<string | null>(null);
  readonly pedidoPendienteGuia = signal<PedidoVendedorDetalle | null>(null);
  readonly generandoGuia = signal(false);

  readonly guiaForm = this.fb.group({
    paqueteria: ['DHL', [Validators.required]],
    numeroGuia: ['', [Validators.required]],
    urlRastreo: ['']
  });

  readonly pedidosFiltrados = computed(() => {
    const filtro = this.filtroActual();
    const pedidos = this.pedidos();
    return filtro === 'todos' ? pedidos : pedidos.filter(pedido => pedido.estado === filtro);
  });

  constructor() {
    this.cargarPedidos();
  }

  reintentar(): void {
    this.cargarPedidos();
  }

  toggleDetalle(pedido: PedidoVendedorDetalle): void {
    this.pedidoExpandidoId.update(id => (id === pedido.id ? null : pedido.id));
  }

  cambiarEstado(pedido: PedidoVendedorDetalle, estado: EstadoPedido): void {
    if (estado === 'enviado') {
      // El backend rechaza pasar a "enviado" directo (ver
      // VendorOrdersService.actualizarEstado) — siempre se llega ahí
      // generando o registrando una guía primero.
      this.guiaForm.reset({ paqueteria: 'DHL', numeroGuia: '', urlRastreo: '' });
      this.pedidoPendienteGuia.set(pedido);
      return;
    }

    this.pedidoVendedorService.actualizarEstado(pedido.id, estado).subscribe({
      next: () => this.cargarPedidos(),
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
    });
  }

  confirmarGuiaManual(): void {
    const pedido = this.pedidoPendienteGuia();
    if (!pedido || this.guiaForm.invalid) {
      this.guiaForm.markAllAsTouched();
      return;
    }

    const { paqueteria, numeroGuia, urlRastreo } = this.guiaForm.getRawValue();

    this.pedidoVendedorService
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
        error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
      });
  }

  // Alternativa a la captura manual: cotiza y genera la guía real con
  // Skydropx sin que el vendedor tenga que escribir nada (ver
  // VendorOrdersService.generarGuiaAutomatica del backend).
  confirmarGuiaAutomatica(): void {
    const pedido = this.pedidoPendienteGuia();
    if (!pedido) {
      return;
    }

    this.generandoGuia.set(true);
    this.pedidoVendedorService.generarGuiaAutomatica(pedido.id).subscribe({
      next: () => {
        this.generandoGuia.set(false);
        this.cargarPedidos();
        this.pedidoPendienteGuia.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.generandoGuia.set(false);
        this.toastService.error(mensajeDeErrorHttp(error));
      }
    });
  }

  cancelarGuia(): void {
    this.pedidoPendienteGuia.set(null);
  }

  etiquetaEstado(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  claseEstado(estado: EstadoPedido): string {
    return claseBadgeEstadoPedido(estado);
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
