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
import { colorAgotado, stockDisponible, tallaAgotada } from '../../shared/utils/inventario.util';

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

  // Imagen generada por RecoloreoService (backend) para el color elegido, si
  // el producto tiene una — el emparejamiento es por NOMBRE (etiqueta legible
  // del catálogo de colores vs `nombreColor` libre que el vendedor puso al
  // generarla), case-insensitive: es la única forma práctica de conectar
  // ambos sin acoplar la entidad de imágenes generadas al catálogo Color.
  // Si el producto no tiene `coloresGenerados` (todo lo mock hoy), esto
  // siempre es null y el comportamiento es idéntico al actual.
  readonly imagenColorSeleccionado = computed(() => {
    const producto = this.producto();
    const color = this.colorSeleccionado();
    if (!producto || !color) {
      return null;
    }
    const etiqueta = this.etiquetaDeColor(color).toLowerCase().trim();
    return (
      producto.coloresGenerados?.find(c => c.nombreColor.toLowerCase().trim() === etiqueta)
        ?.imagenUrl ?? null
    );
  });

  readonly imagenPrincipal = computed(() => this.imagenColorSeleccionado() ?? this.imagenes()[this.indiceImagen()]);
  readonly imagenPrincipalLista = signal(true);

  readonly precioInfo = computed(() => {
    const producto = this.producto();
    return producto
      ? this.ofertaService.calcularPrecio(producto)
      : { precioOriginal: 0, precioFinal: 0 };
  });

  readonly puedeAgregar = computed(() => {
    const talla = this.tallaSeleccionada();
    const requiereColor = this.coloresDisponibles().length > 0;
    if (!talla || (requiereColor && !this.colorSeleccionado())) {
      return false;
    }
    return !this.tallaAgotada(talla) && this.cantidadMaxima() > 0;
  });

  // Ver agregar-carrito-modal.component.ts: mismo tope real de piezas
  // agregables (stock de la combinación elegida menos lo que ya hay en el
  // carrito), en vez del tope fijo de 20 que no miraba el inventario.
  readonly cantidadMaxima = computed(() => {
    const producto = this.producto();
    const talla = this.tallaSeleccionada();
    if (!producto || !talla) {
      return CANTIDAD_MAXIMA;
    }

    const color = this.colorSeleccionado();
    if (this.coloresDisponibles().length > 0 && !color) {
      return CANTIDAD_MAXIMA;
    }

    const disponible = stockDisponible(producto, talla, color);
    const yaEnCarrito = this.cartService.cantidadEnCarrito(producto.id, talla, color ?? undefined);
    return Math.max(0, Math.min(CANTIDAD_MAXIMA, disponible - yaEnCarrito));
  });

  readonly topeGeneralCantidad = CANTIDAD_MAXIMA;

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

    // Si cambia la talla/color elegidos (y por tanto el stock disponible), la
    // cantidad ya tecleada se recorta para no quedar apuntando por encima del
    // nuevo máximo.
    effect(() => {
      const maximo = this.cantidadMaxima();
      if (this.cantidadSeleccionada() > maximo) {
        this.cantidadSeleccionada.set(Math.max(CANTIDAD_MINIMA, maximo));
      }
    });

    // Transición suave al cambiar la imagen principal (galería o color): se
    // baja la opacidad de inmediato y sube de nuevo cuando la nueva imagen
    // termina de cargar (ver onImagenPrincipalCargada), en vez de un salto
    // brusco de una foto a otra.
    effect(() => {
      this.imagenPrincipal();
      this.imagenPrincipalLista.set(false);
    });
  }

  onImagenPrincipalCargada(): void {
    this.imagenPrincipalLista.set(true);
  }

  seleccionarTalla(talla: Talla): void {
    if (this.tallaAgotada(talla)) {
      return;
    }
    this.tallaSeleccionada.set(talla);
  }

  tallaAgotada(talla: Talla): boolean {
    const producto = this.producto();
    return !!producto && tallaAgotada(producto, talla, this.colorSeleccionado());
  }

  colorAgotado(color: Color): boolean {
    const producto = this.producto();
    return !!producto && colorAgotado(producto, color, this.tallaSeleccionada());
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
    if (this.colorAgotado(color)) {
      return;
    }
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
    this.cantidadSeleccionada.update(cantidad => Math.min(this.cantidadMaxima(), cantidad + 1));
  }

  agregarAlCarrito(): void {
    const talla = this.tallaSeleccionada();
    const producto = this.producto();
    if (!talla || !producto || !this.puedeAgregar()) {
      return;
    }

    const agregado = this.cartService.agregarItem(
      producto,
      talla,
      this.cantidadSeleccionada(),
      this.colorSeleccionado() ?? undefined
    );

    if (agregado === 0) {
      this.toastService.error('Ya tienes en tu bolsa todo el stock disponible de esa combinación.');
      return;
    }

    this.agregado.set(true);
    this.toastService.exito(
      agregado < this.cantidadSeleccionada()
        ? `Solo agregamos ${agregado} pieza(s) de "${producto.nombre}": es el stock disponible.`
        : `"${producto.nombre}" se agregó a tu bolsa.`
    );
    this.cantidadSeleccionada.set(1);
    setTimeout(() => this.agregado.set(false), 1500);
  }
}
