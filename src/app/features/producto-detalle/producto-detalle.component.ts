import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { Categoria, Producto, Talla } from '../../core/models/producto.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

const NOMBRES_CATEGORIA: Record<Categoria, string> = {
  pantalon: 'Pantalón',
  playera: 'Playera',
  camisa: 'Camisa',
  bermuda: 'Bermuda'
};

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [BreadcrumbComponent, RouterLink],
  templateUrl: './producto-detalle.component.html'
})
export class ProductoDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly cartService = inject(CartService);

  readonly producto = toSignal<Producto | undefined>(
    this.route.paramMap.pipe(
      switchMap(params => this.productoService.obtenerPorId(params.get('id') ?? ''))
    ),
    { initialValue: undefined }
  );

  readonly tallaSeleccionada = signal<Talla | null>(null);
  readonly agregado = signal(false);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const producto = this.producto();
    if (!producto) {
      return [{ label: 'Inicio', url: '/catalogo' }, { label: 'Producto no encontrado' }];
    }

    return [
      { label: 'Inicio', url: '/catalogo' },
      { label: NOMBRES_CATEGORIA[producto.categoria], url: `/catalogo/${producto.categoria}` },
      { label: producto.nombre }
    ];
  });

  seleccionarTalla(talla: Talla): void {
    this.tallaSeleccionada.set(talla);
  }

  agregarAlCarrito(): void {
    if (!this.tallaSeleccionada()) {
      return;
    }

    this.cartService.cantidadItems.update(cantidad => cantidad + 1);
    this.agregado.set(true);
    setTimeout(() => this.agregado.set(false), 1500);
  }
}
