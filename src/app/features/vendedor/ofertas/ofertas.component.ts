import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { delay } from 'rxjs';
import { OfertaService } from '../../../core/services/oferta.service';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Audiencia, Categoria, Producto, Talla } from '../../../core/models/producto.model';
import { Oferta, TipoDescuento } from '../../../core/models/oferta.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';

const RETRASO_CARGA_MS = 400;
const UMBRAL_STOCK_BAJO = 5;
type AplicaA = 'productos' | 'segmento';

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
  const grupo = control;
  const aplicaA = grupo.get('aplicaA')?.value as AplicaA;

  if (aplicaA === 'productos') {
    const seleccionados = Object.values((grupo.get('productos')?.value ?? {}) as Record<string, boolean>);
    return seleccionados.some(Boolean) ? null : { sinDestino: true };
  }

  const categoria = grupo.get('categoria')?.value;
  const audiencia = grupo.get('audiencia')?.value;
  return categoria || audiencia ? null : { sinDestino: true };
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
      valorDescuento: [10, [Validators.required, Validators.min(0.01)]],
      aplicaA: ['segmento' as AplicaA, [Validators.required]],
      categoria: [''],
      audiencia: [''],
      productos: this.fb.group({}),
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      activa: [true]
    },
    { validators: [destinoValidoValidator, rangoFechasValidator] }
  );

  constructor() {
    this.productoService.obtenerTodos().subscribe(productos => {
      this.productos.set(productos);
      this.ofertaForm.setControl(
        'productos',
        this.fb.group(Object.fromEntries(productos.map(producto => [producto.id, this.fb.control(false)])))
      );
    });

    this.ofertaService
      .obtenerTodos()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe(ofertas => {
        this.ofertas.set(ofertas);
        this.cargando.set(false);
      });
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
      valorDescuento: 10,
      aplicaA: 'segmento',
      categoria: '',
      audiencia: '',
      productos: this.mapaProductos([]),
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
      valorDescuento: oferta.valorDescuento,
      aplicaA: oferta.productosAplicables.length > 0 ? 'productos' : 'segmento',
      categoria: oferta.categoriaAplicable ?? '',
      audiencia: oferta.audienciaAplicable ?? '',
      productos: this.mapaProductos(oferta.productosAplicables),
      fechaInicio: oferta.fechaInicio,
      fechaFin: oferta.fechaFin,
      activa: oferta.activa
    });
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      return;
    }

    const valores = this.ofertaForm.getRawValue();
    const esPorProductos = valores.aplicaA === 'productos';

    const datosOferta = {
      nombre: valores.nombre!,
      tipoDescuento: valores.tipoDescuento as TipoDescuento,
      valorDescuento: valores.valorDescuento!,
      productosAplicables: esPorProductos
        ? Object.entries(valores.productos ?? {})
            .filter(([, seleccionado]) => seleccionado)
            .map(([id]) => id)
        : [],
      categoriaAplicable: !esPorProductos && valores.categoria ? (valores.categoria as Categoria) : undefined,
      audienciaAplicable: !esPorProductos && valores.audiencia ? (valores.audiencia as Audiencia) : undefined,
      fechaInicio: valores.fechaInicio!,
      fechaFin: valores.fechaFin!,
      activa: !!valores.activa
    };

    const edicion = this.ofertaEditando();
    const operacion = edicion
      ? this.ofertaService.actualizarOferta(edicion.id, datosOferta)
      : this.ofertaService.crearOferta(datosOferta);

    operacion.subscribe(() => {
      this.cargarOfertas();
      this.cerrarFormulario();
      this.toastService.exito(edicion ? 'Oferta actualizada.' : 'Oferta creada.');
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

    this.ofertaService.eliminarOferta(oferta.id).subscribe(() => {
      this.cargarOfertas();
      this.toastService.exito(`"${oferta.nombre}" se eliminó.`);
    });
  }

  descripcionValor(oferta: Oferta): string {
    return oferta.tipoDescuento === 'porcentaje' ? `${oferta.valorDescuento}%` : `$${oferta.valorDescuento}`;
  }

  descripcionDestino(oferta: Oferta): string {
    if (oferta.productosAplicables.length > 0) {
      return `${oferta.productosAplicables.length} producto(s)`;
    }

    const partes: string[] = [];
    if (oferta.categoriaAplicable) {
      partes.push(this.categorias.find(c => c.valor === oferta.categoriaAplicable)?.etiqueta ?? oferta.categoriaAplicable);
    }
    if (oferta.audienciaAplicable) {
      partes.push(this.audiencias.find(a => a.valor === oferta.audienciaAplicable)?.etiqueta ?? oferta.audienciaAplicable);
    }
    return partes.length > 0 ? partes.join(' · ') : 'Todo el catálogo';
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

  contarProductosSeleccionados(): number {
    const valores = this.ofertaForm.controls.productos.value as Record<string, boolean>;
    return Object.values(valores ?? {}).filter(Boolean).length;
  }

  private mapaProductos(seleccionados: string[]): Record<string, boolean> {
    return Object.fromEntries(this.productos().map(producto => [producto.id, seleccionados.includes(producto.id)]));
  }

  private cargarOfertas(): void {
    this.ofertaService.obtenerTodos().subscribe(ofertas => this.ofertas.set(ofertas));
  }
}
