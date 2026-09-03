import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { delay } from 'rxjs';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ColoresService } from '../../../core/services/colores.service';
import { TallasService } from '../../../core/services/tallas.service';
import { RecoloreoService } from '../../../core/services/recoloreo.service';
import {
  Audiencia,
  Categoria,
  Color,
  ColorGenerado,
  Etiqueta,
  Producto,
  SIN_COLOR,
  Talla,
  VarianteStock
} from '../../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';

const RETRASO_CARGA_MS = 400;
const TAMANO_PAGINA = 10;

type FiltroCategoria = 'todos' | Categoria;

function alMenosUnaTallaValidator(control: AbstractControl): ValidationErrors | null {
  const seleccionadas = Object.values(control.value as Record<string, boolean>);
  return seleccionadas.some(seleccionada => seleccionada) ? null : { ningunaTalla: true };
}

@Component({
    selector: 'app-mis-productos',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-productos.component.html'
})
export class MisProductosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly coloresService = inject(ColoresService);
  private readonly tallasService = inject(TallasService);
  private readonly recoloreoService = inject(RecoloreoService);

  readonly categorias = CATEGORIAS;
  readonly audiencias = AUDIENCIAS;
  readonly colores = this.coloresService.listado;
  readonly tallas = this.tallasService.listado;

  readonly filtrosCategoria: { valor: FiltroCategoria; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    ...CATEGORIAS
  ];

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly mostrarFormulario = signal(false);
  readonly productoEditando = signal<Producto | null>(null);
  readonly filtroCategoria = signal<FiltroCategoria>('todos');

  readonly productosFiltrados = computed(() => {
    const filtro = this.filtroCategoria();
    const productos = this.productos();
    return filtro === 'todos' ? productos : productos.filter(producto => producto.categoria === filtro);
  });

  readonly paginaVisible = signal(TAMANO_PAGINA);
  readonly productosVisibles = computed(() => this.productosFiltrados().slice(0, this.paginaVisible()));
  readonly hayMasProductos = computed(() => this.productosFiltrados().length > this.paginaVisible());

  readonly nuevoColorNombre = signal('');
  readonly nuevoColorHex = signal('#c9a227');
  readonly mostrarAgregarColor = signal(false);

  readonly nuevaTallaNombre = signal('');
  readonly mostrarAgregarTalla = signal(false);

  // Stock inicial por combinación talla×color, capturado en el mismo
  // formulario (antes solo se podía asignar desde Inventario, así que todo
  // producto nuevo arrancaba con existencias en 0). Se guarda aparte del
  // FormGroup porque las combinaciones dependen de qué tallas/colores están
  // marcados en ese momento, no de un set fijo de controles.
  readonly cantidadesIniciales = signal<VarianteStock[]>([]);

  // Recoloreo automático (ver RecoloreoService, ecommerceback): a diferencia
  // del resto de este componente, ES una llamada de red real — el único uso
  // de HttpClient del proyecto por ahora. Deliberadamente separado de
  // productoForm (no se guarda junto con "Guardar producto": cada color
  // generado ya queda persistido en el backend en el momento de generarlo).
  readonly coloresGenerados = signal<ColorGenerado[]>([]);
  readonly nuevoColorGeneradoNombre = signal('');
  readonly nuevoColorGeneradoHex = signal('#c9a227');
  readonly generandoColor = signal(false);
  readonly errorGenerarColor = signal<string | null>(null);

  readonly productoForm = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    categoria: ['pantalon' as Categoria, [Validators.required]],
    audiencia: ['hombre' as Audiencia, [Validators.required]],
    destacado: [false],
    etiqueta: ['NINGUNA' as 'NINGUNA' | 'NUEVO' | 'ESENCIAL'],
    imagenUrl: [''],
    tallas: this.fb.group(
      Object.fromEntries(this.tallas().map(talla => [talla, this.fb.control(false)])),
      { validators: alMenosUnaTallaValidator }
    ),
    colores: this.fb.group(
      Object.fromEntries(this.colores().map(opcion => [opcion.valor, this.fb.control(false)]))
    )
  });

  constructor() {
    this.cargarProductosIniciales();
  }

  reintentar(): void {
    this.cargarProductosIniciales();
  }

  private cargarProductosIniciales(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.productoService
      .obtenerTodos()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe({
        next: productos => {
          this.productos.set(productos);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(true);
          this.cargando.set(false);
        }
      });
  }

  abrirFormularioNuevo(): void {
    this.productoEditando.set(null);
    this.coloresGenerados.set([]);
    this.cantidadesIniciales.set([]);
    this.reiniciarFormularioColorGenerado();
    this.productoForm.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'pantalon',
      audiencia: 'hombre',
      destacado: false,
      etiqueta: 'NINGUNA',
      imagenUrl: '',
      tallas: this.mapaTallas([]),
      colores: this.mapaColores([])
    });
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(producto: Producto): void {
    this.productoEditando.set(producto);
    this.coloresGenerados.set(producto.coloresGenerados ?? []);
    this.cantidadesIniciales.set(producto.variantes ?? []);
    this.reiniciarFormularioColorGenerado();
    this.productoForm.reset({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria,
      audiencia: producto.audiencia,
      destacado: producto.destacado,
      etiqueta: producto.etiqueta ?? 'NINGUNA',
      imagenUrl: producto.imagenUrl,
      tallas: this.mapaTallas(producto.tallasDisponibles),
      colores: this.mapaColores(producto.coloresDisponibles)
    });
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  cargarMasProductos(): void {
    this.paginaVisible.update(pagina => pagina + TAMANO_PAGINA);
  }

  cambiarFiltroCategoria(filtro: FiltroCategoria): void {
    this.filtroCategoria.set(filtro);
    this.paginaVisible.set(TAMANO_PAGINA);
  }

  onArchivoImagenSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.toastService.error('Selecciona un archivo de imagen válido.');
      input.value = '';
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.productoForm.patchValue({ imagenUrl: lector.result as string });
    };
    lector.readAsDataURL(archivo);
    input.value = '';
  }

  // Tallas/colores actualmente marcados en el formulario (se recalculan en
  // cada ciclo de detección de cambios porque dependen del estado en vivo de
  // los checkboxes, no de un signal independiente).
  tallasSeleccionadas(): Talla[] {
    const valores = this.productoForm.controls.tallas.value as Record<string, boolean>;
    return this.tallas().filter(talla => valores[talla]);
  }

  coloresSeleccionados(): Color[] {
    const valores = this.productoForm.controls.colores.value as Record<string, boolean>;
    return this.colores()
      .map(opcion => opcion.valor)
      .filter(color => valores[color]);
  }

  /** Filas talla×color a mostrar en la grilla de stock inicial. */
  combinacionesStock(): { talla: Talla; color: Color }[] {
    const tallas = this.tallasSeleccionadas();
    const colores = this.coloresSeleccionados();
    const coloresEfectivos = colores.length > 0 ? colores : [SIN_COLOR];
    return tallas.flatMap(talla => coloresEfectivos.map(color => ({ talla, color })));
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  cantidadInicial(talla: Talla, color: Color): number {
    return this.cantidadesIniciales().find(v => v.talla === talla && v.color === color)?.cantidad ?? 0;
  }

  actualizarCantidadInicial(talla: Talla, color: Color, valorCrudo: string): void {
    const cantidad = Math.max(0, Math.floor(Number(valorCrudo)) || 0);
    this.cantidadesIniciales.update(actuales => [
      ...actuales.filter(v => !(v.talla === talla && v.color === color)),
      { talla, color, cantidad }
    ]);
  }

  guardar(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    const valores = this.productoForm.getRawValue();
    const tallasDisponibles = this.tallas().filter(talla => valores.tallas[talla]);
    const coloresDisponibles = this.colores()
      .map(opcion => opcion.valor)
      .filter(color => valores.colores[color]);
    const etiqueta: Etiqueta = valores.etiqueta === 'NINGUNA' ? null : valores.etiqueta;
    const coloresEfectivos = coloresDisponibles.length > 0 ? coloresDisponibles : [SIN_COLOR];
    const variantes: VarianteStock[] = tallasDisponibles.flatMap(talla =>
      coloresEfectivos.map(color => ({ talla, color, cantidad: this.cantidadInicial(talla, color) }))
    );

    const datosProducto = {
      nombre: valores.nombre!,
      descripcion: valores.descripcion ?? '',
      precio: valores.precio!,
      categoria: valores.categoria as Categoria,
      audiencia: valores.audiencia as Audiencia,
      coloresDisponibles,
      destacado: !!valores.destacado,
      tallasDisponibles,
      imagenUrl: valores.imagenUrl || 'https://picsum.photos/seed/nuevo/400/500',
      etiqueta,
      variantes
    };

    const edicion = this.productoEditando();
    const operacion = edicion
      ? this.productoService.actualizarProducto(edicion.id, datosProducto)
      : this.productoService.crearProducto(datosProducto);

    operacion.subscribe(() => {
      this.cargarProductos();
      this.cerrarFormulario();
      this.toastService.exito(edicion ? 'Producto actualizado.' : 'Producto creado.');
    });
  }

  async eliminar(producto: Producto): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `¿Seguro que quieres eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.productoService.eliminarProducto(producto.id).subscribe(() => {
      this.cargarProductos();
      this.toastService.exito(`"${producto.nombre}" se eliminó.`);
    });
  }

  etiquetaDeCategoria(categoria: Categoria): string {
    return this.categorias.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }

  etiquetaDeAudiencia(audiencia: Audiencia): string {
    return this.audiencias.find(opcion => opcion.valor === audiencia)?.etiqueta ?? audiencia;
  }

  abrirAgregarColor(): void {
    this.nuevoColorNombre.set('');
    this.nuevoColorHex.set('#c9a227');
    this.mostrarAgregarColor.set(true);
  }

  cancelarAgregarColor(): void {
    this.mostrarAgregarColor.set(false);
  }

  agregarColorPersonalizado(): void {
    const nombre = this.nuevoColorNombre().trim();
    if (!nombre) {
      return;
    }

    const nuevo = this.coloresService.agregarColor(nombre, this.nuevoColorHex());
    this.productoForm.controls.colores.addControl(nuevo.valor, this.fb.control(true));
    this.mostrarAgregarColor.set(false);
    this.toastService.exito(`Color "${nuevo.etiqueta}" agregado.`);
  }

  esColorPersonalizado(valor: string): boolean {
    return this.coloresService.esPersonalizado(valor);
  }

  async eliminarColorPersonalizado(opcion: { valor: string; etiqueta: string }): Promise<void> {
    const productosConColor = this.productos().filter(producto => producto.coloresDisponibles.includes(opcion.valor));

    if (productosConColor.length > 0) {
      this.toastService.error(
        `No puedes eliminar "${opcion.etiqueta}": ${productosConColor.length} producto(s) lo usan.`
      );
      return;
    }

    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar color',
      mensaje: `¿Seguro que quieres eliminar el color "${opcion.etiqueta}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.coloresService.eliminarColor(opcion.valor);
    this.productoForm.controls.colores.removeControl(opcion.valor as never);
    this.toastService.exito(`Color "${opcion.etiqueta}" eliminado.`);
  }

  abrirAgregarTalla(): void {
    this.nuevaTallaNombre.set('');
    this.mostrarAgregarTalla.set(true);
  }

  cancelarAgregarTalla(): void {
    this.mostrarAgregarTalla.set(false);
  }

  agregarTallaPersonalizada(): void {
    const nombre = this.nuevaTallaNombre().trim();
    if (!nombre) {
      return;
    }

    const resultado = this.tallasService.agregarTalla(nombre);
    if (!resultado.ok) {
      this.toastService.error(
        resultado.motivo === 'duplicada'
          ? 'Esa talla ya existe.'
          : 'Formato de talla no válido. Usa letra (S, M, L, XL, 2XL...) o número (28, 30, 32...).'
      );
      return;
    }

    this.productoForm.controls.tallas.addControl(resultado.talla, this.fb.control(false));
    this.mostrarAgregarTalla.set(false);
    this.toastService.exito(`Talla "${resultado.talla}" agregada.`);
  }

  esTallaPersonalizada(talla: string): boolean {
    return this.tallasService.esPersonalizada(talla);
  }

  async eliminarTallaPersonalizada(talla: string): Promise<void> {
    const productosConTalla = this.productos().filter(producto => producto.tallasDisponibles.includes(talla));

    if (productosConTalla.length > 0) {
      this.toastService.error(`No puedes eliminar "${talla}": ${productosConTalla.length} producto(s) la usan.`);
      return;
    }

    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar talla',
      mensaje: `¿Seguro que quieres eliminar la talla "${talla}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.tallasService.eliminarTalla(talla);
    this.productoForm.controls.tallas.removeControl(talla as never);
    this.toastService.exito(`Talla "${talla}" eliminada.`);
  }

  generarColor(): void {
    const producto = this.productoEditando();
    const nombreColor = this.nuevoColorGeneradoNombre().trim();
    if (!producto || !nombreColor || this.generandoColor()) {
      return;
    }

    this.generandoColor.set(true);
    this.errorGenerarColor.set(null);

    this.recoloreoService.generarColor(producto.id, nombreColor, this.nuevoColorGeneradoHex()).subscribe({
      next: colorGenerado => {
        this.coloresGenerados.update(colores => [...colores, colorGenerado]);
        this.generandoColor.set(false);
        this.reiniciarFormularioColorGenerado();
        this.toastService.exito(`Color "${colorGenerado.nombreColor}" generado.`);
      },
      error: (error: HttpErrorResponse) => {
        this.generandoColor.set(false);
        this.errorGenerarColor.set(this.mensajeDeError(error));
      }
    });
  }

  async eliminarColorGenerado(color: ColorGenerado): Promise<void> {
    const producto = this.productoEditando();
    if (!producto) {
      return;
    }

    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar color generado',
      mensaje: `¿Seguro que quieres eliminar el color "${color.nombreColor}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.recoloreoService.eliminarColor(producto.id, color.id).subscribe({
      next: () => {
        this.coloresGenerados.update(colores => colores.filter(c => c.id !== color.id));
        this.toastService.exito(`Color "${color.nombreColor}" eliminado.`);
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(this.mensajeDeError(error));
      }
    });
  }

  private reiniciarFormularioColorGenerado(): void {
    this.nuevoColorGeneradoNombre.set('');
    this.nuevoColorGeneradoHex.set('#c9a227');
    this.errorGenerarColor.set(null);
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    const mensaje = error.error?.message;
    if (Array.isArray(mensaje)) {
      return mensaje.join(' ');
    }
    return mensaje ?? 'No se pudo completar la operación. Intenta de nuevo.';
  }

  private mapaColores(seleccionados: string[]): Record<string, boolean> {
    return Object.fromEntries(this.colores().map(opcion => [opcion.valor, seleccionados.includes(opcion.valor)]));
  }

  private mapaTallas(seleccionadas: string[]): Record<string, boolean> {
    return Object.fromEntries(this.tallas().map(talla => [talla, seleccionadas.includes(talla)]));
  }

  private cargarProductos(): void {
    this.productoService.obtenerTodos().subscribe(productos => this.productos.set(productos));
  }
}
