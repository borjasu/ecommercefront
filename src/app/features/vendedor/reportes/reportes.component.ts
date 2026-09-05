import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { ProductoMasVendido, PuntoVenta, ReportesService } from '../../../core/services/reportes.service';

type Granularidad = 'dia' | 'semana' | 'mes';
type Preset = '7' | '30' | '90' | 'todo';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

@Component({
    selector: 'app-reportes',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './reportes.component.html'
})
export class ReportesComponent {
  private readonly reportesService = inject(ReportesService);

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

  readonly granularidad = signal<Granularidad>('dia');
  readonly presetActivo = signal<Preset>('30');
  readonly fechaDesde = signal<string>(this.fechaHaceNDias(30));
  readonly fechaHasta = signal<string>(this.fechaHaceNDias(0));

  readonly cargando = signal(true);
  readonly error = signal(false);

  readonly ingresosTotales = signal(0);
  readonly totalPedidos = signal(0);
  readonly ticketPromedio = signal(0);
  readonly serieVentas = signal<PuntoVenta[]>([]);
  readonly productosMasVendidos = signal<ProductoMasVendido[]>([]);

  readonly maxVenta = computed(() => Math.max(1, ...this.serieVentas().map(punto => punto.total)));

  constructor() {
    // GET /vendedor/reportes ya calcula todo del lado del backend (ver
    // ReportesService) — este effect solo dispara una nueva consulta cada
    // vez que cambia el rango de fechas o la granularidad, en vez de
    // recalcular localmente a partir de una lista completa de pedidos.
    effect(() => {
      this.cargarReportes(this.fechaDesde(), this.fechaHasta(), this.granularidad());
    });
  }

  reintentar(): void {
    this.cargarReportes(this.fechaDesde(), this.fechaHasta(), this.granularidad());
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

  private cargarReportes(desde: string, hasta: string, granularidad: Granularidad): void {
    this.cargando.set(true);
    this.error.set(false);
    this.reportesService.reportes({ desde, hasta, granularidad }).subscribe({
      next: resumen => {
        this.ingresosTotales.set(resumen.ingresosTotales);
        this.totalPedidos.set(resumen.totalPedidos);
        this.ticketPromedio.set(resumen.ticketPromedio);
        this.serieVentas.set(resumen.serieVentas);
        this.productosMasVendidos.set(resumen.productosMasVendidos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  private fechaHaceNDias(n: number): string {
    const fecha = new Date(Date.now() - n * MS_POR_DIA);
    return fecha.toISOString().slice(0, 10);
  }
}
