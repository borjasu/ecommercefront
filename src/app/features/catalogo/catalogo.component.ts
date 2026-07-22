import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { Categoria, Producto, Talla } from '../../core/models/producto.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ProductoCardComponent } from '../../shared/components/producto-card/producto-card.component';

interface CategoriaOpcion {
  valor: Categoria;
  etiqueta: string;
}

interface ResultadoCatalogo {
  productos: Producto[];
  categoria: Categoria | null;
  termino: string | null;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [BreadcrumbComponent, ProductoCardComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productoService = inject(ProductoService);
  private readonly cartService = inject(CartService);

  readonly categorias: CategoriaOpcion[] = [
    { valor: 'pantalon', etiqueta: 'Pantalón' },
    { valor: 'playera', etiqueta: 'Playera' },
    { valor: 'camisa', etiqueta: 'Camisa' },
    { valor: 'bermuda', etiqueta: 'Bermuda' }
  ];

  private readonly resultado = toSignal(
    combineLatest({ params: this.route.paramMap, query: this.route.queryParamMap }).pipe(
      switchMap(({ params, query }) => {
        const termino = query.get('q');
        if (termino) {
          return this.productoService
            .buscar(termino)
            .pipe(map(productos => ({ productos, categoria: null as Categoria | null, termino })));
        }

        const categoriaParam = params.get('categoria');
        const categoria = this.esCategoriaValida(categoriaParam) ? categoriaParam : null;
        const productos$ = categoria
          ? this.productoService.obtenerPorCategoria(categoria)
          : this.productoService.obtenerTodos();

        return productos$.pipe(map(productos => ({ productos, categoria, termino: null as string | null })));
      })
    ),
    { initialValue: { productos: [], categoria: null, termino: null } as ResultadoCatalogo }
  );

  readonly productos = computed(() => this.resultado().productos);
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
    const categoria = this.categoriaActual();
    return categoria ? this.etiquetaDeCategoria(categoria) : 'Caballero';
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const termino = this.terminoBusqueda();
    if (termino) {
      return [{ label: 'Inicio', url: '/catalogo' }, { label: `Resultados para "${termino}"` }];
    }

    const items: BreadcrumbItem[] = [{ label: 'Inicio', url: '/catalogo' }, { label: 'Caballero', url: '/catalogo' }];
    const categoria = this.categoriaActual();
    if (categoria) {
      items.push({ label: this.etiquetaDeCategoria(categoria) });
    }
    return items;
  });

  seleccionarCategoria(categoria: Categoria): void {
    this.router.navigate(['/catalogo', categoria]);
  }

  verTodo(): void {
    this.router.navigate(['/catalogo']);
  }

  claseTab(activa: boolean): string {
    return activa
      ? 'cursor-pointer rounded-sm border border-gold bg-gold px-5 py-2 font-sans text-sm font-semibold uppercase tracking-wide text-header'
      : 'cursor-pointer rounded-sm border border-muted px-5 py-2 font-sans text-sm uppercase tracking-wide text-ink transition-colors duration-150 hover:border-gold';
  }

  onAgregarAlCarrito(evento: { producto: Producto; talla: Talla; cantidad: number }): void {
    this.cartService.agregarItem(evento.producto, evento.talla, evento.cantidad);
  }

  private esCategoriaValida(valor: string | null): valor is Categoria {
    return !!valor && this.categorias.some(categoria => categoria.valor === valor);
  }

  private etiquetaDeCategoria(categoria: Categoria): string {
    return this.categorias.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }
}
