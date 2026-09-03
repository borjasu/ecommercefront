import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { FavoritosService } from '../../../core/services/favoritos.service';
import { SelectorProductoModalService } from '../../../core/services/selector-producto-modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { ColoresService } from '../../../core/services/colores.service';
import { Color, Talla } from '../../../core/models/producto.model';
import { colorAgotado, stockDisponible, tallaAgotada } from '../../utils/inventario.util';

const CANTIDAD_MINIMA = 1;
const CANTIDAD_MAXIMA = 20;

@Component({
  selector: 'app-agregar-carrito-modal',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './agregar-carrito-modal.component.html'
})
export class AgregarCarritoModalComponent {
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  readonly modalService = inject(SelectorProductoModalService);
  readonly favoritosService = inject(FavoritosService);
  private readonly coloresService = inject(ColoresService);

  readonly topeGeneralCantidad = CANTIDAD_MAXIMA;

  readonly tallaSeleccionada = signal<Talla | null>(null);
  readonly colorSeleccionado = signal<Color | null>(null);
  readonly cantidad = signal(CANTIDAD_MINIMA);
  readonly agregado = signal(false);
  readonly indiceImagen = signal(0);

  readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly coloresDisponibles = computed(() => this.modalService.productoActivo()?.coloresDisponibles ?? []);

  readonly imagenes = computed(() => {
    const producto = this.modalService.productoActivo();
    if (!producto) {
      return [];
    }
    return producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes : [producto.imagenUrl];
  });

  // Igual que en producto-detalle.component.ts: emparejamiento por nombre
  // (case-insensitive) entre el color elegido y las imágenes generadas por
  // RecoloreoService (backend). Si el producto no tiene `coloresGenerados`,
  // siempre es null y el comportamiento es idéntico al actual.
  readonly imagenColorSeleccionado = computed(() => {
    const producto = this.modalService.productoActivo();
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

  readonly puedeAgregar = computed(() => {
    const talla = this.tallaSeleccionada();
    const requiereColor = this.coloresDisponibles().length > 0;
    if (!talla || (requiereColor && !this.colorSeleccionado())) {
      return false;
    }
    return !this.tallaAgotada(talla) && this.cantidadMaxima() > 0;
  });

  // Tope real de piezas que se pueden agregar: el stock de la combinación
  // talla+color elegida, menos lo que ya hubiera de esa misma línea en el
  // carrito. Antes el selector de cantidad solo topaba en 20 sin mirar el
  // inventario, así que dejaba agregar más piezas de las que existían.
  readonly cantidadMaxima = computed(() => {
    const producto = this.modalService.productoActivo();
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

  constructor() {
    effect(() => {
      if (this.modalService.productoActivo()) {
        this.tallaSeleccionada.set(null);
        this.colorSeleccionado.set(null);
        this.cantidad.set(CANTIDAD_MINIMA);
        this.agregado.set(false);
        this.indiceImagen.set(0);
        setTimeout(() => this.panel()?.nativeElement.focus());
      }
    });

    // Ver producto-detalle.component.ts: misma transición suave al cambiar
    // de imagen principal (galería o color).
    effect(() => {
      this.imagenPrincipal();
      this.imagenPrincipalLista.set(false);
    });

    // Si cambia la talla/color elegidos (y por tanto el stock disponible), la
    // cantidad ya tecleada se recorta para no quedar apuntando por encima del
    // nuevo máximo.
    effect(() => {
      const maximo = this.cantidadMaxima();
      if (this.cantidad() > maximo) {
        this.cantidad.set(Math.max(CANTIDAD_MINIMA, maximo));
      }
    });
  }

  onImagenPrincipalCargada(): void {
    this.imagenPrincipalLista.set(true);
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

  seleccionarTalla(talla: Talla): void {
    if (this.tallaAgotada(talla)) {
      return;
    }
    this.tallaSeleccionada.set(talla);
  }

  seleccionarColor(color: Color): void {
    if (this.colorAgotado(color)) {
      return;
    }
    this.colorSeleccionado.set(color);
  }

  tallaAgotada(talla: Talla): boolean {
    const producto = this.modalService.productoActivo();
    return !!producto && tallaAgotada(producto, talla, this.colorSeleccionado());
  }

  colorAgotado(color: Color): boolean {
    const producto = this.modalService.productoActivo();
    return !!producto && colorAgotado(producto, color, this.tallaSeleccionada());
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  hexDeColor(color: Color): string {
    return this.coloresService.hexDe(color);
  }

  decrementarCantidad(): void {
    this.cantidad.update(valor => Math.max(CANTIDAD_MINIMA, valor - 1));
  }

  incrementarCantidad(): void {
    this.cantidad.update(valor => Math.min(this.cantidadMaxima(), valor + 1));
  }

  confirmar(): void {
    const producto = this.modalService.productoActivo();
    const talla = this.tallaSeleccionada();
    if (!producto || !talla || !this.puedeAgregar()) {
      return;
    }

    const agregado = this.cartService.agregarItem(producto, talla, this.cantidad(), this.colorSeleccionado() ?? undefined);
    if (agregado === 0) {
      this.toastService.error('Ya tienes en tu bolsa todo el stock disponible de esa combinación.');
      return;
    }

    this.agregado.set(true);
    this.toastService.exito(
      agregado < this.cantidad()
        ? `Solo agregamos ${agregado} pieza(s) de "${producto.nombre}": es el stock disponible.`
        : `"${producto.nombre}" se agregó a tu bolsa.`
    );
    setTimeout(() => this.modalService.cerrar(), 700);
  }

  cerrar(): void {
    this.modalService.cerrar();
  }

  alternarFavorito(): void {
    const producto = this.modalService.productoActivo();
    if (!producto) {
      return;
    }

    const eraFavorito = this.favoritosService.esFavorito(producto.id);
    this.favoritosService.alternar(producto.id);
    this.toastService.exito(eraFavorito ? 'Se quitó de tus favoritos.' : 'Se agregó a tus favoritos.');
  }

  onKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.cerrar();
    }
  }
}
