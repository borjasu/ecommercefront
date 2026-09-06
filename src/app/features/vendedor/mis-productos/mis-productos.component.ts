import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, delay, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ColoresService, ColorOpcion } from '../../../core/services/colores.service';
import { TallasService } from '../../../core/services/tallas.service';
import { FotoColorService } from '../../../core/services/foto-color.service';
import {
  Audiencia,
  Categoria,
  Color,
  Etiqueta,
  ImagenColorProducto,
  Producto,
  SIN_COLOR,
  Talla,
  VarianteStock
} from '../../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';
import { mensajeDeErrorHttp } from '../../../shared/utils/http-error.util';

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
  private readonly fotoColorService = inject(FotoColorService);

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
  readonly guardando = signal(false);
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

  // Fotos por color (ver FotoColorService, ecommerceback): una foto real por
  // cada color marcado en "Colores disponibles", reemplaza al recoloreo
  // algorítmico que existía antes. `fotosColorExistentes` son las que ya
  // están subidas al backend (solo relevante editando un producto);
  // `fotosColorPendientes` son archivos elegidos en este formulario que
  // todavía no se han subido — se suben recién al confirmar "Guardar" (ver
  // guardar()), una llamada de red por color, después de crear/actualizar el
  // producto base. Ambas indexadas por `Color` (el `valor` del checkbox), no
  // por nombre de archivo ni por id.
  readonly fotosColorExistentes = signal<ImagenColorProducto[]>([]);
  readonly fotosColorPendientes = signal<Record<Color, File>>({});
  readonly previewsFotoColorPendiente = signal<Record<Color, string>>({});
  readonly subiendoFotosColor = signal(false);
  readonly erroresFotoColor = signal<Record<Color, string>>({});

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

    // Colores/TallasService cargan su listado del backend real de forma
    // asíncrona (ver ColoresService/TallasService) — cuando llegan (o cuando
    // se agrega/elimina uno desde este mismo formulario) se sincronizan los
    // controles de los FormGroup `tallas`/`colores`, que se construyeron
    // vacíos si este componente se instanció antes de que la primera
    // respuesta llegara.
    effect(() => {
      this.sincronizarControlesTallas(this.tallas());
      this.sincronizarControlesColores(this.colores());
    });
  }

  private sincronizarControlesTallas(tallas: Talla[]): void {
    const grupo = this.productoForm.controls.tallas;
    for (const talla of tallas) {
      if (!grupo.contains(talla)) {
        grupo.addControl(talla, this.fb.control(false));
      }
    }
  }

  private sincronizarControlesColores(colores: ColorOpcion[]): void {
    const grupo = this.productoForm.controls.colores;
    for (const opcion of colores) {
      if (!grupo.contains(opcion.valor)) {
        grupo.addControl(opcion.valor, this.fb.control(false));
      }
    }
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
    this.cantidadesIniciales.set([]);
    this.reiniciarEstadoFotosColor();
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
    this.cantidadesIniciales.set(producto.variantes ?? []);
    this.reiniciarEstadoFotosColor();
    this.fotosColorExistentes.set(producto.imagenesColores ?? []);
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
    this.revocarPreviewsFotoColor();
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

  // Igual que coloresSeleccionados() pero devuelve la ColorOpcion completa
  // (etiqueta/hex), no solo el valor — la sección "Foto para <color>" del
  // formulario itera esto para saber cuántos campos de subida mostrar y con
  // qué etiqueta/tono.
  opcionesColorMarcadas(): ColorOpcion[] {
    const valores = this.productoForm.controls.colores.value as Record<string, boolean>;
    return this.colores().filter(opcion => valores[opcion.valor]);
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

    this.guardando.set(true);
    operacion.subscribe({
      next: producto => {
        this.guardando.set(false);
        this.cargarProductos();
        this.toastService.exito(edicion ? 'Producto actualizado.' : 'Producto creado.');

        // El producto base (con o sin fotos) ya quedó guardado en este punto
        // — apuntar el formulario al producto real (id incluido, necesario
        // para subir fotos de un producto recién creado) antes de intentar
        // las fotos pendientes, sin importar si alguna falla después.
        this.productoEditando.set(producto);
        this.subirFotosColorPendientes(producto.id);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toastService.error(mensajeDeErrorHttp(error));
      }
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

    this.productoService.eliminarProducto(producto.id).subscribe({
      next: () => {
        this.cargarProductos();
        this.toastService.exito(`"${producto.nombre}" se eliminó.`);
      },
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
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

    this.coloresService.agregarColor(nombre, this.nuevoColorHex()).subscribe({
      next: nuevo => {
        this.productoForm.controls.colores.addControl(nuevo.valor, this.fb.control(true));
        this.mostrarAgregarColor.set(false);
        this.toastService.exito(`Color "${nuevo.etiqueta}" agregado.`);
      },
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
    });
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

    this.coloresService.eliminarColor(opcion.valor).subscribe({
      next: () => {
        this.productoForm.controls.colores.removeControl(opcion.valor as never);
        this.toastService.exito(`Color "${opcion.etiqueta}" eliminado.`);
      },
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
    });
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

    this.tallasService.agregarTalla(nombre).subscribe({
      next: resultado => {
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
      },
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
    });
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

    this.tallasService.eliminarTalla(talla).subscribe({
      next: () => {
        this.productoForm.controls.tallas.removeControl(talla as never);
        this.toastService.exito(`Talla "${talla}" eliminada.`);
      },
      error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
    });
  }

  // Intercepta el checkbox de un color ANTES de dejarlo desmarcado: si ese
  // color ya tenía una foto (subida o solo elegida en este formulario, sin
  // guardar todavía), se pide confirmación — nunca se descarta en silencio.
  // Marcar (checked=true) nunca necesita confirmación, solo desmarcar.
  async onToggleColor(opcion: ColorOpcion, evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    if (input.checked) {
      return;
    }

    const existente = this.fotoExistenteDe(opcion.etiqueta);
    const tienePendiente = !!this.fotosColorPendientes()[opcion.valor];
    if (!existente && !tienePendiente) {
      return;
    }

    const confirmado = await this.confirmService.confirmar({
      titulo: 'Quitar color',
      mensaje: existente
        ? `"${opcion.etiqueta}" ya tiene una foto subida. Si quitas el color, esa foto se elimina. ¿Continuar?`
        : `Vas a descartar la foto que elegiste para "${opcion.etiqueta}" (todavía no se ha guardado). ¿Continuar?`,
      textoConfirmar: 'Quitar color',
      peligroso: true
    });

    if (!confirmado) {
      // Revertir: el DOM y el FormControl ya quedaron desmarcados por el
      // propio evento (change), hay que re-marcar ambos a mano.
      input.checked = true;
      this.productoForm.controls.colores.get(opcion.valor)?.setValue(true);
      return;
    }

    this.descartarFotoPendiente(opcion.valor);

    const producto = this.productoEditando();
    if (existente && producto) {
      this.fotoColorService.eliminarFoto(producto.id, existente.id).subscribe({
        next: () => this.fotosColorExistentes.update(actuales => actuales.filter(f => f.id !== existente.id)),
        error: (error: HttpErrorResponse) => this.toastService.error(mensajeDeErrorHttp(error))
      });
    }
  }

  onArchivoColorSeleccionado(color: Color, evento: Event): void {
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

    this.revocarPreviewFotoColor(color);
    this.fotosColorPendientes.update(actuales => ({ ...actuales, [color]: archivo }));
    this.previewsFotoColorPendiente.update(actuales => ({ ...actuales, [color]: URL.createObjectURL(archivo) }));
    this.erroresFotoColor.update(({ [color]: _quitado, ...resto }) => resto);
    input.value = '';
  }

  // Preview a mostrar bajo "Foto para <color>": el archivo recién elegido
  // (todavía sin subir) tiene prioridad sobre la foto ya guardada — así el
  // vendedor ve de inmediato el archivo que acaba de seleccionar, no el
  // anterior que está por reemplazar.
  fotoColorPreviewUrl(color: Color): string | null {
    return this.previewsFotoColorPendiente()[color] ?? this.fotoExistenteDe(this.etiquetaDeColor(color))?.imagenUrl ?? null;
  }

  // Reintenta la subida de un color puntual sin tener que volver a elegir el
  // archivo — el File ya elegido se conserva en fotosColorPendientes aunque
  // la subida anterior haya fallado.
  reintentarFotoColor(color: Color): void {
    const producto = this.productoEditando();
    const archivo = this.fotosColorPendientes()[color];
    if (!producto || !archivo) {
      return;
    }

    this.subiendoFotosColor.set(true);
    this.subirFotoDeColor(producto.id, color, archivo).subscribe(() => {
      this.subiendoFotosColor.set(false);
      if (Object.keys(this.fotosColorPendientes()).length === 0) {
        this.cerrarFormulario();
        this.toastService.exito('Fotos por color guardadas.');
      }
    });
  }

  private fotoExistenteDe(etiqueta: string): ImagenColorProducto | undefined {
    const buscada = etiqueta.toLowerCase().trim();
    return this.fotosColorExistentes().find(f => f.nombreColor.toLowerCase().trim() === buscada);
  }

  // Sube cada foto pendiente en paralelo, una llamada por color, después de
  // que el producto base (crear/actualizar) ya se guardó con éxito.
  private subirFotosColorPendientes(productoId: string): void {
    const pendientes = this.fotosColorPendientes();
    const colores = Object.keys(pendientes);
    if (colores.length === 0) {
      this.cerrarFormulario();
      return;
    }

    this.subiendoFotosColor.set(true);
    this.erroresFotoColor.set({});

    forkJoin(colores.map(color => this.subirFotoDeColor(productoId, color, pendientes[color]))).subscribe(
      resultados => {
        this.subiendoFotosColor.set(false);
        if (resultados.every(r => r.ok)) {
          this.cerrarFormulario();
          this.toastService.exito('Fotos por color guardadas.');
        } else {
          // El producto YA se guardó (ver guardar()) — un fallo aquí no lo
          // afecta, solo faltan una o más fotos. Se deja el formulario
          // abierto con el error puntual bajo cada color que falló, para
          // reintentar sin repetir todo el guardado.
          this.toastService.error('El producto se guardó, pero alguna foto no se pudo subir. Revisa el detalle debajo de cada color.');
        }
      }
    );
  }

  // Se envuelve en catchError (en vez de dejar que el error se propague) a
  // propósito: con forkJoin, un solo error sin capturar cancelaría TODAS las
  // demás subidas en curso — justo lo que el punto 3 del prompt pide evitar.
  private subirFotoDeColor(productoId: string, color: Color, archivo: File): Observable<{ color: Color; ok: boolean }> {
    const opcion = this.colores().find(o => o.valor === color);
    const nombreColor = opcion?.etiqueta ?? color;
    const colorHex = opcion?.hex ?? '#c9a227';
    const existente = this.fotoExistenteDe(nombreColor);

    // Reemplazo: si ya había una foto con ese nombre, se borra antes de subir
    // la nueva — el backend rechaza un nombreColor duplicado por producto
    // (ver ProductoColorImagenesService.validarNombreNoDuplicado).
    const borrarSiExiste = existente ? this.fotoColorService.eliminarFoto(productoId, existente.id) : of(undefined);

    return borrarSiExiste.pipe(
      switchMap(() => this.fotoColorService.subirFoto(productoId, nombreColor, colorHex, archivo)),
      tap(subida => {
        this.fotosColorExistentes.update(actuales => [...actuales.filter(f => f.id !== existente?.id), subida]);
        this.descartarFotoPendiente(color);
      }),
      map(() => ({ color, ok: true })),
      catchError((error: HttpErrorResponse) => {
        this.erroresFotoColor.update(actuales => ({ ...actuales, [color]: mensajeDeErrorHttp(error) }));
        return of({ color, ok: false });
      })
    );
  }

  private descartarFotoPendiente(color: Color): void {
    this.fotosColorPendientes.update(({ [color]: _quitado, ...resto }) => resto);
    this.revocarPreviewFotoColor(color);
    this.erroresFotoColor.update(({ [color]: _quitado, ...resto }) => resto);
  }

  private revocarPreviewFotoColor(color: Color): void {
    const url = this.previewsFotoColorPendiente()[color];
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewsFotoColorPendiente.update(({ [color]: _quitado, ...resto }) => resto);
  }

  private revocarPreviewsFotoColor(): void {
    Object.values(this.previewsFotoColorPendiente()).forEach(url => URL.revokeObjectURL(url));
    this.previewsFotoColorPendiente.set({});
  }

  private reiniciarEstadoFotosColor(): void {
    this.revocarPreviewsFotoColor();
    this.fotosColorExistentes.set([]);
    this.fotosColorPendientes.set({});
    this.erroresFotoColor.set({});
    this.subiendoFotosColor.set(false);
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
