import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { delay } from 'rxjs';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ColoresService } from '../../../core/services/colores.service';
import { TallasService } from '../../../core/services/tallas.service';
import { Audiencia, Categoria, Etiqueta, Producto } from '../../../core/models/producto.model';
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
      etiqueta
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
