import { Component, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ToastService } from '../../core/services/toast.service';
import { OfertaService } from '../../core/services/oferta.service';
import { Audiencia, Categoria, Color, Producto, Talla } from '../../core/models/producto.model';
import { ColoresService } from '../../core/services/colores.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

const NOMBRES_CATEGORIA: Record<Categoria, string> = {
  pantalon: 'Pantalón',
  playera: 'Playera',
  camisa: 'Camisa',
  bermuda: 'Bermuda'
};

const NOMBRES_AUDIENCIA: Record<Audiencia, string> = {
  hombre: 'Hombre',
  nino: 'Niño'
};

const CANTIDAD_MINIMA = 1;
const CANTIDAD_MAXIMA = 20;

@Component({
    selector: 'app-producto-detalle',
    imports: [BreadcrumbComponent, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './producto-detalle.component.html'
})
export class ProductoDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly ofertaService = inject(OfertaService);
  private readonly coloresService = inject(ColoresService);
  readonly favoritosService = inject(FavoritosService);

  readonly producto = toSignal<Producto | undefined>(
    this.route.paramMap.pipe(
      switchMap(params => this.productoService.obtenerPorId(params.get('id') ?? ''))
    ),
    { initialValue: undefined }
  );

  readonly tallaSeleccionada = signal<Talla | null>(null);
  readonly colorSeleccionado = signal<Color | null>(null);
  readonly cantidadSeleccionada = signal(CANTIDAD_MINIMA);
  readonly agregado = signal(false);

  readonly indiceImagen = signal(0);
  readonly zoomActivo = signal(false);
  readonly zoomPosicion = signal({ x: 50, y: 50 });

  readonly imagenes = computed(() => {
    const producto = this.producto();
    if (!producto) {
      return [];
    }
    return producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes : [producto.imagenUrl];
  });

  readonly coloresDisponibles = computed(() => this.producto()?.coloresDisponibles ?? []);

  readonly precioInfo = computed(() => {
    const producto = this.producto();
    return producto
      ? this.ofertaService.calcularPrecio(producto)
      : { precioOriginal: 0, precioFinal: 0 };
  });

  readonly puedeAgregar = computed(() => {
    const talla = this.tallaSeleccionada();
    const requiereColor = this.coloresDisponibles().length > 0;
    return !!talla && (!requiereColor || !!this.colorSeleccionado());
  });

  readonly nombreCategoria = computed(() => {
    const producto = this.producto();
    return producto ? NOMBRES_CATEGORIA[producto.categoria] : '';
  });

  readonly nombreAudiencia = computed(() => {
    const producto = this.producto();
    return producto ? NOMBRES_AUDIENCIA[producto.audiencia] : '';
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const producto = this.producto();
    if (!producto) {
      return [{ label: 'Inicio', url: '/' }, { label: 'Producto no encontrado' }];
    }

    return [
      { label: 'Inicio', url: '/' },
      {
        label: NOMBRES_CATEGORIA[producto.categoria],
        url: `/catalogo/${producto.audiencia}/${producto.categoria}`
      },
      { label: producto.nombre }
    ];
  });

  constructor() {
    effect(() => {
      this.producto();
      this.indiceImagen.set(0);
      this.tallaSeleccionada.set(null);
      this.colorSeleccionado.set(null);
    });
  }

  seleccionarTalla(talla: Talla): void {
    this.tallaSeleccionada.set(talla);
  }

  alternarFavorito(): void {
    const producto = this.producto();
    if (!producto) {
      return;
    }

    const eraFavorito = this.favoritosService.esFavorito(producto.id);
    this.favoritosService.alternar(producto.id);
    this.toastService.exito(eraFavorito ? 'Se quitó de tus favoritos.' : 'Se agregó a tus favoritos.');
  }

  seleccionarColor(color: Color): void {
    this.colorSeleccionado.set(color);
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  hexDeColor(color: Color): string {
    return this.coloresService.hexDe(color);
  }

  imagenAnterior(): void {
    const total = this.imagenes().length;
    this.indiceImagen.update(indice => (indice - 1 + total) % total);
  }

  imagenSiguiente(): void {
    const total = this.imagenes().length;
    this.indiceImagen.update(indice => (indice + 1) % total);
  }

  irAImagen(indice: number): void {
    this.indiceImagen.set(indice);
  }

  alternarZoom(evento: MouseEvent): void {
    this.zoomActivo.update(activo => !activo);
    if (this.zoomActivo()) {
      this.actualizarZoomPosicion(evento);
    }
  }

  onImagenMouseMove(evento: MouseEvent): void {
    if (!this.zoomActivo()) {
      return;
    }
    this.actualizarZoomPosicion(evento);
  }

  private actualizarZoomPosicion(evento: MouseEvent): void {
    const contenedor = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((evento.clientX - contenedor.left) / contenedor.width) * 100;
    const y = ((evento.clientY - contenedor.top) / contenedor.height) * 100;
    this.zoomPosicion.set({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    });
  }

  decrementarCantidad(): void {
    this.cantidadSeleccionada.update(cantidad => Math.max(CANTIDAD_MINIMA, cantidad - 1));
  }

  incrementarCantidad(): void {
    this.cantidadSeleccionada.update(cantidad => Math.min(CANTIDAD_MAXIMA, cantidad + 1));
  }

  agregarAlCarrito(): void {
    const talla = this.tallaSeleccionada();
    const producto = this.producto();
    if (!talla || !producto || !this.puedeAgregar()) {
      return;
    }

    this.cartService.agregarItem(producto, talla, this.cantidadSeleccionada(), this.colorSeleccionado() ?? undefined);
    this.agregado.set(true);
    this.toastService.exito(`"${producto.nombre}" se agregó a tu bolsa.`);
    this.cantidadSeleccionada.set(1);
    setTimeout(() => this.agregado.set(false), 1500);
  }
}
