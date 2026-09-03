import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { ProductoService } from '../../../core/services/producto.service';
import { ColoresService, ColorOpcion } from '../../../core/services/colores.service';
import { TallasService } from '../../../core/services/tallas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Color, Producto, SIN_COLOR, Talla, VarianteStock } from '../../../core/models/producto.model';

const RETRASO_CARGA_MS = 300;

// Sección separada de "Mis Productos": ahí se define QUÉ tallas/colores tiene
// un producto (ver mis-productos.component.ts, que ya sincroniza `variantes`
// con esas listas vía ProductoService). Aquí solo se ajustan CANTIDADES de
// combinaciones ya existentes y se agregan tallas/colores puntuales a un
// producto — nunca se crean productos nuevos.
@Component({
  selector: 'app-inventario',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './inventario.component.html'
})
export class InventarioComponent {
  private readonly productoService = inject(ProductoService);
  private readonly coloresService = inject(ColoresService);
  private readonly tallasService = inject(TallasService);
  private readonly toastService = inject(ToastService);

  readonly colores = this.coloresService.listado;
  readonly tallas = this.tallasService.listado;

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly busqueda = signal('');
  readonly soloSinStock = signal(false);

  readonly productoSeleccionadoId = signal<string | null>(null);
  readonly colorParaAgregar = signal('');
  readonly tallaParaAgregar = signal('');

  // Cambios de cantidad capturados en el formulario de gestión pero aún no
  // confirmados: antes cada input guardaba de inmediato con (change), sin
  // forma de descartar una edición a medias. Ahora se acumulan aquí y solo
  // se aplican al backend al presionar "Guardar cambios".
  readonly cambiosPendientes = signal<VarianteStock[]>([]);

  readonly productoSeleccionado = computed(
    () => this.productos().find(producto => producto.id === this.productoSeleccionadoId()) ?? null
  );

  readonly productosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const soloSinStock = this.soloSinStock();

    return this.productos().filter(producto => {
      if (termino && !producto.nombre.toLowerCase().includes(termino)) {
        return false;
      }
      if (soloSinStock && this.stockTotal(producto) > 0) {
        return false;
      }
      return true;
    });
  });

  constructor() {
    this.cargarProductos();
  }

  reintentar(): void {
    this.cargarProductos();
  }

  private cargarProductos(): void {
    this.cargando.set(true);
    setTimeout(() => {
      this.productoService.obtenerTodos().subscribe(productos => {
        this.productos.set(productos);
        this.cargando.set(false);
      });
    }, RETRASO_CARGA_MS);
  }

  stockTotal(producto: Producto): number {
    return (producto.variantes ?? []).reduce((total, variante) => total + variante.cantidad, 0);
  }

  cantidadDe(producto: Producto, talla: Talla, color: Color): number {
    const pendiente = this.cambiosPendientes().find(v => v.talla === talla && v.color === color);
    if (pendiente) {
      return pendiente.cantidad;
    }
    return (producto.variantes ?? []).find(variante => variante.talla === talla && variante.color === color)
      ?.cantidad ?? 0;
  }

  abrirGestion(producto: Producto): void {
    this.productoSeleccionadoId.set(producto.id);
    this.colorParaAgregar.set('');
    this.tallaParaAgregar.set('');
    this.cambiosPendientes.set([]);
  }

  /** Cierra el formulario sin aplicar cambios de cantidad sin guardar. */
  cerrarGestion(): void {
    this.productoSeleccionadoId.set(null);
    this.cambiosPendientes.set([]);
  }

  /** Captura la edición localmente; no se guarda hasta "Guardar cambios". */
  editarCantidad(talla: Talla, color: Color, valorCrudo: string): void {
    const cantidad = Math.max(0, Math.floor(Number(valorCrudo)) || 0);
    this.cambiosPendientes.update(actuales => [
      ...actuales.filter(v => !(v.talla === talla && v.color === color)),
      { talla, color, cantidad }
    ]);
  }

  guardarCambios(producto: Producto): void {
    const pendientes = this.cambiosPendientes();
    if (pendientes.length === 0) {
      this.cerrarGestion();
      return;
    }

    pendientes.forEach(({ talla, color, cantidad }) => {
      this.productoService.actualizarStockVariante(producto.id, talla, color, cantidad).subscribe(actualizado => {
        this.reemplazarEnLista(actualizado);
      });
    });

    this.toastService.exito('Stock actualizado.');
    this.cerrarGestion();
  }

  coloresParaAgregar(producto: Producto): ColorOpcion[] {
    return this.colores().filter(opcion => !producto.coloresDisponibles.includes(opcion.valor));
  }

  tallasParaAgregar(producto: Producto): Talla[] {
    return this.tallas().filter(talla => !producto.tallasDisponibles.includes(talla));
  }

  agregarColor(producto: Producto): void {
    const color = this.colorParaAgregar();
    if (!color) {
      return;
    }

    this.productoService.agregarColorAProducto(producto.id, color).subscribe(actualizado => {
      this.reemplazarEnLista(actualizado);
      this.colorParaAgregar.set('');
      this.toastService.exito(`Color "${this.etiquetaDeColor(color)}" agregado al producto.`);
    });
  }

  agregarTalla(producto: Producto): void {
    const talla = this.tallaParaAgregar();
    if (!talla) {
      return;
    }

    this.productoService.agregarTallaAProducto(producto.id, talla).subscribe(actualizado => {
      this.reemplazarEnLista(actualizado);
      this.tallaParaAgregar.set('');
      this.toastService.exito(`Talla "${talla}" agregada al producto.`);
    });
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  hexDeColor(color: Color): string {
    return this.coloresService.hexDe(color);
  }

  readonly sinColor = SIN_COLOR;

  private reemplazarEnLista(actualizado: Producto): void {
    this.productos.update(productos => productos.map(p => (p.id === actualizado.id ? actualizado : p)));
  }
}
