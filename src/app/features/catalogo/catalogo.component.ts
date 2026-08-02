import { Component, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, delay, map, startWith, switchMap } from 'rxjs/operators';
import { ProductoService } from '../../core/services/producto.service';
import { ColoresService } from '../../core/services/colores.service';
import { Audiencia, Categoria, Color, Producto, Talla } from '../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../shared/constants/categorias';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ProductoCardComponent } from '../../shared/components/producto-card/producto-card.component';
import { ProductoCardSkeletonComponent } from '../../shared/components/producto-card-skeleton/producto-card-skeleton.component';

const RETRASO_CARGA_MS = 400;
const TAMANO_PAGINA = 12;

type OrdenPrecio = 'ninguno' | 'asc' | 'desc';

interface ResultadoCatalogo {
  productos: Producto[];
  audiencia: Audiencia | null;
  categoria: Categoria | null;
  termino: string | null;
  cargando: boolean;
  error: boolean;
}

@Component({
    selector: 'app-catalogo',
    imports: [BreadcrumbComponent, ProductoCardComponent, ProductoCardSkeletonComponent, NgTemplateOutlet],
    templateUrl: './catalogo.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly coloresService = inject(ColoresService);

  readonly categorias = CATEGORIAS;

  // Solo talla/color que EXISTEN de verdad entre productos activos ahora
  // mismo (no la lista completa del catálogo dinámico) — así el panel de
  // filtros nunca ofrece una opción que de todos modos daría cero resultados.
  private readonly filtrosDisponibles = toSignal(this.productoService.obtenerFiltrosDisponibles(), {
    initialValue: { tallas: [] as string[], colores: [] as string[], precioMin: 0, precioMax: 0 }
  });

  readonly tallas = computed(() => this.filtrosDisponibles().tallas);
  readonly colores = computed(() => {
    const nombresDisponibles = new Set(this.filtrosDisponibles().colores);
    return this.coloresService.listado().filter(opcion => nombresDisponibles.has(opcion.valor));
  });

  private readonly intentoRecarga = signal(0);

  private readonly resultado = toSignal(
    combineLatest({
      params: this.route.paramMap,
      query: this.route.queryParamMap,
      intento: toObservable(this.intentoRecarga)
    }).pipe(
      switchMap(({ params, query }) => {
        const termino = query.get('q');
        if (termino) {
          return this.productoService.buscar(termino).pipe(
            delay(RETRASO_CARGA_MS),
            map(productos => ({ productos, audiencia: null, categoria: null, termino, cargando: false, error: false })),
            startWith({
              productos: [],
              audiencia: null,
              categoria: null,
              termino,
              cargando: true,
              error: false
            } as ResultadoCatalogo),
            catchError(() =>
              of({ productos: [], audiencia: null, categoria: null, termino, cargando: false, error: true } as ResultadoCatalogo)
            )
          );
        }

        const audienciaParam = params.get('audiencia');
        const audiencia = this.esAudienciaValida(audienciaParam) ? audienciaParam : null;
        const categoriaParam = params.get('categoria');
        const categoria = this.esCategoriaValida(categoriaParam) ? categoriaParam : null;

        const productos$ = audiencia
          ? this.productoService.obtenerPorAudiencia(audiencia)
          : this.productoService.obtenerTodos();

        return productos$.pipe(
          delay(RETRASO_CARGA_MS),
          map(productos => ({
            productos,
            audiencia,
            categoria,
            termino: null as string | null,
            cargando: false,
            error: false
          })),
          startWith({ productos: [], audiencia, categoria, termino: null, cargando: true, error: false } as ResultadoCatalogo),
          catchError(() =>
            of({ productos: [], audiencia, categoria, termino: null, cargando: false, error: true } as ResultadoCatalogo)
          )
        );
      })
    ),
    {
      initialValue: {
        productos: [],
        audiencia: null,
        categoria: null,
        termino: null,
        cargando: true,
        error: false
      } as ResultadoCatalogo
    }
  );

  readonly productosBase = computed(() => this.resultado().productos);
  readonly audienciaActual = computed(() => this.resultado().audiencia);
  readonly categoriaActual = computed(() => this.resultado().categoria);
  readonly terminoBusqueda = computed(() => this.resultado().termino);
  readonly cargando = computed(() => this.resultado().cargando);
  readonly error = computed(() => this.resultado().error);

  readonly filtroTallas = signal<Set<Talla>>(new Set());
  readonly filtroCategorias = signal<Set<Categoria>>(new Set());
  readonly filtroColores = signal<Set<Color>>(new Set());
  readonly filtroPrecioMin = signal<number | null>(null);
  readonly filtroPrecioMax = signal<number | null>(null);
  readonly ordenPrecio = signal<OrdenPrecio>('ninguno');

  readonly filtrosVisibles = signal(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  readonly columnas = signal<1 | 2 | 3 | 4>(3);

  readonly claseGrid = computed(() => {
    switch (this.columnas()) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-2 sm:grid-cols-4';
      default:
        return 'grid-cols-2 sm:grid-cols-3';
    }
  });

  readonly filtrosActivosCount = computed(
    () =>
      this.filtroTallas().size +
      this.filtroCategorias().size +
      this.filtroColores().size +
      (this.filtroPrecioMin() != null ? 1 : 0) +
      (this.filtroPrecioMax() != null ? 1 : 0)
  );

  readonly productos = computed(() => {
    const tallas = this.filtroTallas();
    const categorias = this.filtroCategorias();
    const colores = this.filtroColores();
    const min = this.filtroPrecioMin();
    const max = this.filtroPrecioMax();
    const orden = this.ordenPrecio();

    const filtrados = this.productosBase().filter(producto => {
      if (tallas.size > 0 && !producto.tallasDisponibles.some(talla => tallas.has(talla))) {
        return false;
      }
      if (categorias.size > 0 && !categorias.has(producto.categoria)) {
        return false;
      }
      if (colores.size > 0 && !producto.coloresDisponibles.some(color => colores.has(color))) {
        return false;
      }
      if (min != null && producto.precio < min) {
        return false;
      }
      if (max != null && producto.precio > max) {
        return false;
      }
      return true;
    });

    if (orden === 'ninguno') {
      return filtrados;
    }

    return [...filtrados].sort((a, b) => (orden === 'asc' ? a.precio - b.precio : b.precio - a.precio));
  });

  readonly paginaVisible = signal(TAMANO_PAGINA);

  readonly productosVisibles = computed(() => this.productos().slice(0, this.paginaVisible()));

  readonly hayMasProductos = computed(() => this.productos().length > this.paginaVisible());

  readonly mensajeVacio = computed(() =>
    this.terminoBusqueda()
      ? `No encontramos productos que coincidan con "${this.terminoBusqueda()}".`
      : 'No hay productos que coincidan con los filtros seleccionados.'
  );

  readonly tituloSeccion = computed(() => {
    const termino = this.terminoBusqueda();
    if (termino) {
      return `Resultados para "${termino}"`;
    }

    const audiencia = this.audienciaActual();
    if (!audiencia) {
      return 'Todos los productos';
    }

    const etiquetaAudiencia = this.etiquetaDeAudiencia(audiencia);
    const categoria = this.categoriaActual();
    return categoria ? `${etiquetaAudiencia} · ${this.etiquetaDeCategoria(categoria)}` : etiquetaAudiencia;
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const termino = this.terminoBusqueda();
    if (termino) {
      return [{ label: 'Inicio', url: '/' }, { label: `Resultados para "${termino}"` }];
    }

    const audiencia = this.audienciaActual();
    if (!audiencia) {
      return [{ label: 'Inicio', url: '/' }, { label: 'Todos los productos' }];
    }

    const items: BreadcrumbItem[] = [
      { label: 'Inicio', url: '/' },
      { label: this.etiquetaDeAudiencia(audiencia), url: `/catalogo/${audiencia}` }
    ];

    const categoria = this.categoriaActual();
    if (categoria) {
      items.push({ label: this.etiquetaDeCategoria(categoria) });
    }
    return items;
  });

  constructor() {
    effect(() => {
      const categoria = this.categoriaActual();
      this.filtroCategorias.set(categoria ? new Set([categoria]) : new Set());
    });

    effect(() => {
      this.productos();
      this.paginaVisible.set(TAMANO_PAGINA);
    });
  }

  cargarMasProductos(): void {
    this.paginaVisible.update(pagina => pagina + TAMANO_PAGINA);
  }

  reintentar(): void {
    this.intentoRecarga.update(intento => intento + 1);
  }

  toggleTalla(talla: Talla): void {
    this.filtroTallas.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(talla)) {
        nuevo.delete(talla);
      } else {
        nuevo.add(talla);
      }
      return nuevo;
    });
  }

  toggleCategoria(categoria: Categoria): void {
    this.filtroCategorias.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(categoria)) {
        nuevo.delete(categoria);
      } else {
        nuevo.add(categoria);
      }
      return nuevo;
    });
  }

  toggleColor(color: Color): void {
    this.filtroColores.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(color)) {
        nuevo.delete(color);
      } else {
        nuevo.add(color);
      }
      return nuevo;
    });
  }

  onPrecioMinChange(valor: string): void {
    this.filtroPrecioMin.set(valor === '' ? null : Number(valor));
  }

  onPrecioMaxChange(valor: string): void {
    this.filtroPrecioMax.set(valor === '' ? null : Number(valor));
  }

  onOrdenChange(valor: string): void {
    this.ordenPrecio.set(valor as OrdenPrecio);
  }

  alternarFiltros(): void {
    this.filtrosVisibles.update(visible => !visible);
  }

  cambiarColumnas(columnas: 1 | 2 | 3 | 4): void {
    this.columnas.set(columnas);
  }

  limpiarFiltros(): void {
    this.filtroTallas.set(new Set());
    this.filtroCategorias.set(new Set());
    this.filtroColores.set(new Set());
    this.filtroPrecioMin.set(null);
    this.filtroPrecioMax.set(null);
    this.ordenPrecio.set('ninguno');
  }

  private esAudienciaValida(valor: string | null): valor is Audiencia {
    return !!valor && AUDIENCIAS.some(opcion => opcion.valor === valor);
  }

  private esCategoriaValida(valor: string | null): valor is Categoria {
    return !!valor && CATEGORIAS.some(opcion => opcion.valor === valor);
  }

  private etiquetaDeAudiencia(audiencia: Audiencia): string {
    return AUDIENCIAS.find(opcion => opcion.valor === audiencia)?.etiqueta ?? audiencia;
  }

  private etiquetaDeCategoria(categoria: Categoria): string {
    return CATEGORIAS.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }
}
