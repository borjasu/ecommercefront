import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { delay } from 'rxjs';
import { ProductoService } from '../../core/services/producto.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { Producto } from '../../core/models/producto.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ProductoCardComponent } from '../../shared/components/producto-card/producto-card.component';
import { ProductoCardSkeletonComponent } from '../../shared/components/producto-card-skeleton/producto-card-skeleton.component';

const RETRASO_CARGA_MS = 400;

@Component({
    selector: 'app-favoritos',
    imports: [RouterLink, BreadcrumbComponent, ProductoCardComponent, ProductoCardSkeletonComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './favoritos.component.html'
})
export class FavoritosComponent {
  private readonly productoService = inject(ProductoService);
  private readonly favoritosService = inject(FavoritosService);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, { label: 'Favoritos' }];

  private readonly todosLosProductos = signal<Producto[]>([]);
  readonly cargando = signal(true);

  readonly productos = computed(() =>
    this.todosLosProductos().filter(producto => this.favoritosService.esFavorito(producto.id))
  );

  constructor() {
    this.productoService
      .obtenerTodos()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe(productos => {
        this.todosLosProductos.set(productos);
        this.cargando.set(false);
      });
  }
}
