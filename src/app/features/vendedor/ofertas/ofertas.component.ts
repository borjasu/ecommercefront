import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { OfertaService } from '../../../core/services/oferta.service';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Audiencia, Categoria, Producto, Talla } from '../../../core/models/producto.model';
import { AplicaA, Oferta, TipoDescuento } from '../../../core/models/oferta.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';

const UMBRAL_STOCK_BAJO = 5;

// El modelo Producto todavía no tiene cantidades por talla (solo tallasDisponibles: Talla[]).
// Estas funciones leen un posible campo `stockPorTalla` de forma defensiva para que el
// indicador de "stock bajo" se active solo si ese dato llega a existir, sin romper nada hoy.
interface StockPorTalla {
  talla: Talla;
  cantidad: number;
}

function obtenerStockPorTalla(producto: Producto): StockPorTalla[] | undefined {
  return (producto as Producto & { stockPorTalla?: StockPorTalla[] }).stockPorTalla;
}

function stockTotal(producto: Producto): number | undefined {
  const stock = obtenerStockPorTalla(producto);
  return stock ? stock.reduce((total, item) => total + item.cantidad, 0) : undefined;
}

function esStockBajo(producto: Producto): boolean {
  const total = stockTotal(producto);
  return total !== undefined && total < UMBRAL_STOCK_BAJO;
}

function resumenStock(producto: Producto): string {
  const stock = obtenerStockPorTalla(producto);

  if (!stock) {
    return producto.tallasDisponibles.length > 0
      ? `Tallas disponibles: ${producto.tallasDisponibles.join(', ')}`
      : 'Sin tallas disponibles';
  }

  const conExistencia = stock.filter(item => item.cantidad > 0);
  if (conExistencia.length === 0) {
    return 'Sin stock';
  }

  return `Stock: ${conExistencia.map(item => `${item.talla} (${item.cantidad})`).join(', ')}`;
}

function destinoValidoValidator(control: AbstractControl): ValidationErrors | null {
  const aplicaA = control.get('aplicaA')?.value as AplicaA;

  if (aplicaA === 'producto') {
    return control.get('productoId')?.value ? null : { sinDestino: true };
  }
  if (aplicaA === 'categoria') {
    return control.get('categoria')?.value ? null : { sinDestino: true };
  }
  return control.get('audiencia')?.value ? null : { sinDestino: true };
}

function rangoFechasValidator(control: AbstractControl): ValidationErrors | null {
  const inicio = control.get('fechaInicio')?.value;
  const fin = control.get('fechaFin')?.value;
  if (!inicio || !fin) {
    return null;
  }
  return new Date(fin) >= new Date(inicio) ? null : { rangoInvalido: true };
}

@Component({
    selector: 'app-ofertas',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './ofertas.component.html'
})
export class OfertasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ofertaService = inject(OfertaService);
  private readonly productoService = inject(ProductoService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  readonly categorias = CATEGORIAS;
  readonly audiencias = AUDIENCIAS;

  readonly ofertas = signal<Oferta[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly mostrarFormulario = signal(false);
  readonly ofertaEditando = signal<Oferta | null>(null);

  readonly busquedaProductos = signal('');
  readonly filtroCategoriaProductos = signal<Categoria | ''>('');
  readonly filtroAudienciaProductos = signal<Audiencia | ''>('');
  readonly soloStockBajo = signal(false);

  readonly hayDatosStock = computed(() => this.productos().some(producto => obtenerStockPorTalla(producto) !== undefined));

  readonly productosFiltrados = computed(() => {
    const termino = this.busquedaProductos().trim().toLowerCase();
    const categoria = this.filtroCategoriaProductos();
    const audiencia = this.filtroAudienciaProductos();
    const soloBajo = this.soloStockBajo();

    const filtrados = this.productos().filter(producto => {
      if (termino && !producto.nombre.toLowerCase().includes(termino)) {
        return false;
      }
      if (categoria && producto.categoria !== categoria) {
        return false;
      }
      if (audiencia && producto.audiencia !== audiencia) {
        return false;
      }
      if (soloBajo && !esStockBajo(producto)) {
        return false;
      }
      return true;
    });

    return this.hayDatosStock()
      ? [...filtrados].sort((a, b) => (stockTotal(a) ?? Infinity) - (stockTotal(b) ?? Infinity))
      : [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly ofertaForm = this.fb.group(
    {
      nombre: ['', [Validators.required]],
      tipoDescuento: ['porcentaje' as TipoDescuento, [Validators.required]],
      valor: [10, [Validators.required, Validators.min(0.01)]],
      aplicaA: ['categoria' as AplicaA, [Validators.required]],
      categoria: [''],
      audiencia: [''],
      productoId: [''],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      activa: [true]
    },
    { validators: [destinoValidoValidator, rangoFechasValidator] }
  );

  constructor() {
    this.productoService.obtenerTodos().subscribe(productos => this.productos.set(productos));
    this.cargarOfertas();
  }

  private reiniciarFiltrosProductos(): void {
    this.busquedaProductos.set('');
    this.filtroCategoriaProductos.set('');
    this.filtroAudienciaProductos.set('');
    this.soloStockBajo.set(false);
  }

  abrirFormularioNuevo(): void {
    this.reiniciarFiltrosProductos();
    this.ofertaEditando.set(null);
    this.ofertaForm.reset({
      nombre: '',
      tipoDescuento: 'porcentaje',
      valor: 10,
      aplicaA: 'categoria',
      categoria: '',
      audiencia: '',
      productoId: '',
      fechaInicio: '',
      fechaFin: '',
      activa: true
    });
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(oferta: Oferta): void {
    this.reiniciarFiltrosProductos();
    this.ofertaEditando.set(oferta);
    this.ofertaForm.reset({
      nombre: oferta.nombre,
      tipoDescuento: oferta.tipoDescuento,
      valor: oferta.valor,
      aplicaA: oferta.aplicaA,
      categoria: oferta.categoria ?? '',
      audiencia: oferta.audiencia ?? '',
      productoId: oferta.productoId ?? '',
      fechaInicio: oferta.fechaInicio,
      fechaFin: oferta.fechaFin,
      activa: oferta.activa
    });
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  seleccionarProducto(id: string): void {
    this.ofertaForm.controls.productoId.setValue(id);
  }

  guardar(): void {
    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      return;
    }

    const valores = this.ofertaForm.getRawValue();
    const aplicaA = valores.aplicaA as AplicaA;

    const datosOferta = {
      nombre: valores.nombre!,
      tipoDescuento: valores.tipoDescuento as TipoDescuento,
      valor: valores.valor!,
      aplicaA,
      productoId: aplicaA === 'producto' ? valores.productoId || null : null,
      categoria: aplicaA === 'categoria' ? (valores.categoria as Categoria) || null : null,
      audiencia: aplicaA === 'audiencia' ? (valores.audiencia as Audiencia) || null : null,
      fechaInicio: valores.fechaInicio!,
      fechaFin: valores.fechaFin!,
      activa: !!valores.activa
    };

    const edicion = this.ofertaEditando();
    const operacion = edicion
      ? this.ofertaService.actualizarOferta(edicion.id, datosOferta)
      : this.ofertaService.crearOferta(datosOferta);

    operacion.subscribe({
      next: () => {
        this.cargarOfertas();
        this.cerrarFormulario();
        this.toastService.exito(edicion ? 'Oferta actualizada.' : 'Oferta creada.');
      },
      error: () => this.toastService.error('No pudimos guardar la oferta. Intenta de nuevo.')
    });
  }

  async eliminar(oferta: Oferta): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar oferta',
      mensaje: `¿Seguro que quieres eliminar "${oferta.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.ofertaService.eliminarOferta(oferta.id).subscribe({
      next: () => {
        this.cargarOfertas();
        this.toastService.exito(`"${oferta.nombre}" se eliminó.`);
      },
      error: () => this.toastService.error('No pudimos eliminar la oferta.')
    });
  }

  descripcionValor(oferta: Oferta): string {
    return oferta.tipoDescuento === 'porcentaje' ? `${oferta.valor}%` : `$${oferta.valor}`;
  }

  descripcionDestino(oferta: Oferta): string {
    if (oferta.aplicaA === 'producto') {
      return this.productos().find(producto => producto.id === oferta.productoId)?.nombre ?? 'Producto eliminado';
    }
    if (oferta.aplicaA === 'categoria') {
      return this.etiquetaDeCategoria(oferta.categoria as Categoria);
    }
    return this.etiquetaDeAudiencia(oferta.audiencia as Audiencia);
  }

  etiquetaDeCategoria(categoria: Categoria): string {
    return this.categorias.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }

  etiquetaDeAudiencia(audiencia: Audiencia): string {
    return this.audiencias.find(opcion => opcion.valor === audiencia)?.etiqueta ?? audiencia;
  }

  esStockBajo(producto: Producto): boolean {
    return esStockBajo(producto);
  }

  resumenStock(producto: Producto): string {
    return resumenStock(producto);
  }

  private cargarOfertas(): void {
    this.cargando.set(true);
    this.ofertaService.obtenerTodos().subscribe({
      next: ofertas => {
        this.ofertas.set(ofertas);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No pudimos cargar las ofertas.');
        this.cargando.set(false);
      }
    });
  }
}
