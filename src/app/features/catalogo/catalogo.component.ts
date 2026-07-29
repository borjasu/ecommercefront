import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { Audiencia, Categoria, Producto, Talla } from '../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../shared/constants/categorias';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ProductoCardComponent } from '../../shared/components/producto-card/producto-card.component';

interface ResultadoCatalogo {
  productos: Producto[];
  audiencia: Audiencia | null;
  categoria: Categoria | null;
  termino: string | null;
}

@Component({
    selector: 'app-catalogo',
    imports: [BreadcrumbComponent, ProductoCardComponent],
    templateUrl: './catalogo.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly cartService = inject(CartService);

  private readonly resultado = toSignal(
    combineLatest({ params: this.route.paramMap, query: this.route.queryParamMap }).pipe(
      switchMap(({ params, query }) => {
        const termino = query.get('q');
        if (termino) {
          return this.productoService
            .buscar(termino)
            .pipe(map(productos => ({ productos, audiencia: null, categoria: null, termino })));
        }

        const audienciaParam = params.get('audiencia');
        const audiencia = this.esAudienciaValida(audienciaParam) ? audienciaParam : null;
        const categoriaParam = params.get('categoria');
        const categoria = this.esCategoriaValida(categoriaParam) ? categoriaParam : null;

        const productos$ = audiencia
          ? this.productoService.obtenerPorAudiencia(audiencia, categoria ?? undefined)
          : this.productoService.obtenerTodos();

        return productos$.pipe(
          map(productos => ({ productos, audiencia, categoria, termino: null as string | null }))
        );
      })
    ),
    { initialValue: { productos: [], audiencia: null, categoria: null, termino: null } as ResultadoCatalogo }
  );

  readonly productos = computed(() => this.resultado().productos);
  readonly audienciaActual = computed(() => this.resultado().audiencia);
  readonly categoriaActual = computed(() => this.resultado().categoria);
  readonly terminoBusqueda = computed(() => this.resultado().termino);

  readonly mensajeVacio = computed(() =>
    this.terminoBusqueda()
      ? `No encontramos productos que coincidan con "${this.terminoBusqueda()}".`
      : 'No hay productos disponibles en esta categoría por ahora.'
  );

  readonly tituloSeccion = computed(() => {
    const termino = this.terminoBusqueda();
    if (termino) {
      return `Resultados para "${termino}"`;
    }

    const audiencia = this.audienciaActual();
    if (!audiencia) {
      return 'Catálogo';
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
      return [{ label: 'Inicio', url: '/' }];
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

  onAgregarAlCarrito(evento: { producto: Producto; talla: Talla; cantidad: number }): void {
    this.cartService.agregarItem(evento.producto, evento.talla, evento.cantidad);
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
