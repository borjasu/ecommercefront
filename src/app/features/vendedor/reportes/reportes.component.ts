import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { VendorPedidoService } from '../../../core/services/vendor-pedido.service';
import { Pedido } from '../../../core/models/pedido.model';

type Granularidad = 'dia' | 'semana' | 'mes';
type Preset = '7' | '30' | '90' | 'todo';

interface PuntoVenta {
  etiqueta: string;
  total: number;
}

interface ProductoVendido {
  productoId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function inicioDeSemana(fecha: Date): Date {
  const copia = new Date(fecha);
  const dia = copia.getDay();
  const diferencia = (dia + 6) % 7; // lunes como inicio de semana
  copia.setDate(copia.getDate() - diferencia);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

@Component({
    selector: 'app-reportes',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './reportes.component.html'
})
export class ReportesComponent {
  private readonly vendorPedidoService = inject(VendorPedidoService);

  readonly presets: { valor: Preset; etiqueta: string }[] = [
    { valor: '7', etiqueta: 'Últimos 7 días' },
    { valor: '30', etiqueta: 'Últimos 30 días' },
    { valor: '90', etiqueta: 'Últimos 90 días' },
    { valor: 'todo', etiqueta: 'Todo' }
  ];

  readonly opcionesGranularidad: { valor: Granularidad; etiqueta: string }[] = [
    { valor: 'dia', etiqueta: 'Día' },
    { valor: 'semana', etiqueta: 'Semana' },
    { valor: 'mes', etiqueta: 'Mes' }
  ];

  readonly pedidos = signal<Pedido[]>([]);
  readonly granularidad = signal<Granularidad>('dia');
  readonly presetActivo = signal<Preset>('30');
  readonly fechaDesde = signal<string>(this.fechaHaceNDias(30));
  readonly fechaHasta = signal<string>(this.fechaHaceNDias(0));

  readonly pedidosEnRango = computed(() => {
    const desde = new Date(this.fechaDesde());
    const hasta = new Date(this.fechaHasta());
    hasta.setHours(23, 59, 59, 999);

    return this.pedidos().filter(pedido => {
      const fecha = new Date(pedido.fecha);
      return fecha >= desde && fecha <= hasta;
    });
  });

  readonly pedidosValidos = computed(() => this.pedidosEnRango().filter(pedido => pedido.estado !== 'cancelado'));

  readonly ingresosTotales = computed(() =>
    Math.round(this.pedidosValidos().reduce((total, pedido) => total + pedido.total, 0) * 100) / 100
  );

  readonly totalPedidos = computed(() => this.pedidosValidos().length);

  readonly ticketPromedio = computed(() =>
    this.totalPedidos() > 0 ? Math.round((this.ingresosTotales() / this.totalPedidos()) * 100) / 100 : 0
  );

  readonly serieVentas = computed<PuntoVenta[]>(() => {
    const granularidad = this.granularidad();
    const buckets = new Map<string, { etiqueta: string; total: number; orden: number }>();

    for (const pedido of this.pedidosValidos()) {
      const fecha = new Date(pedido.fecha);
      const { clave, etiqueta, orden } = this.claveBucket(fecha, granularidad);
      const actual = buckets.get(clave) ?? { etiqueta, total: 0, orden };
      actual.total += pedido.total;
      buckets.set(clave, actual);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.orden - b.orden)
      .map(({ etiqueta, total }) => ({ etiqueta, total: Math.round(total * 100) / 100 }));
  });

  readonly maxVenta = computed(() => Math.max(1, ...this.serieVentas().map(punto => punto.total)));

  readonly productosMasVendidos = computed<ProductoVendido[]>(() => {
    const acumulado = new Map<string, ProductoVendido>();

    for (const pedido of this.pedidosValidos()) {
      for (const item of pedido.items) {
        const existente = acumulado.get(item.producto.id);
        const ingresos = item.precioUnitario * item.cantidad;

        if (existente) {
          existente.cantidad += item.cantidad;
          existente.ingresos += ingresos;
        } else {
          acumulado.set(item.producto.id, {
            productoId: item.producto.id,
            nombre: item.producto.nombre,
            cantidad: item.cantidad,
            ingresos
          });
        }
      }
    }

    return Array.from(acumulado.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  });

  constructor() {
    this.vendorPedidoService.obtenerTodos().subscribe(pedidos => this.pedidos.set(pedidos));
  }

  aplicarPreset(preset: Preset): void {
    this.presetActivo.set(preset);

    if (preset === 'todo') {
      this.fechaDesde.set('2000-01-01');
      this.fechaHasta.set(this.fechaHaceNDias(0));
      return;
    }

    this.fechaDesde.set(this.fechaHaceNDias(Number(preset)));
    this.fechaHasta.set(this.fechaHaceNDias(0));
  }

  onFechaDesdeChange(valor: string): void {
    this.presetActivo.set('todo');
    this.fechaDesde.set(valor);
  }

  onFechaHastaChange(valor: string): void {
    this.presetActivo.set('todo');
    this.fechaHasta.set(valor);
  }

  alturaBarra(total: number): number {
    return Math.max(4, (total / this.maxVenta()) * 100);
  }

  private claveBucket(fecha: Date, granularidad: Granularidad): { clave: string; etiqueta: string; orden: number } {
    if (granularidad === 'mes') {
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const etiqueta = fecha.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      return { clave, etiqueta, orden: fecha.getFullYear() * 12 + fecha.getMonth() };
    }

    if (granularidad === 'semana') {
      const inicio = inicioDeSemana(fecha);
      const clave = inicio.toISOString().slice(0, 10);
      const etiqueta = inicio.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      return { clave, etiqueta, orden: inicio.getTime() };
    }

    const clave = fecha.toISOString().slice(0, 10);
    const etiqueta = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    return { clave, etiqueta, orden: new Date(clave).getTime() };
  }

  private fechaHaceNDias(n: number): string {
    const fecha = new Date(Date.now() - n * MS_POR_DIA);
    return fecha.toISOString().slice(0, 10);
  }
}
