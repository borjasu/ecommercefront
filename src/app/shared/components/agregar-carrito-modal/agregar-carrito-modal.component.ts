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
import { Color, Talla } from '../../../core/models/producto.model';
import { COLORES } from '../../constants/colores';

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

  readonly colores = COLORES;

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

  readonly puedeAgregar = computed(() => {
    const talla = this.tallaSeleccionada();
    const requiereColor = this.coloresDisponibles().length > 0;
    return !!talla && (!requiereColor || !!this.colorSeleccionado());
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
    this.tallaSeleccionada.set(talla);
  }

  seleccionarColor(color: Color): void {
    this.colorSeleccionado.set(color);
  }

  etiquetaDeColor(color: Color): string {
    return this.colores.find(opcion => opcion.valor === color)?.etiqueta ?? color;
  }

  hexDeColor(color: Color): string {
    return this.colores.find(opcion => opcion.valor === color)?.hex ?? '#000000';
  }

  decrementarCantidad(): void {
    this.cantidad.update(valor => Math.max(CANTIDAD_MINIMA, valor - 1));
  }

  incrementarCantidad(): void {
    this.cantidad.update(valor => Math.min(CANTIDAD_MAXIMA, valor + 1));
  }

  confirmar(): void {
    const producto = this.modalService.productoActivo();
    const talla = this.tallaSeleccionada();
    if (!producto || !talla || !this.puedeAgregar()) {
      return;
    }

    this.cartService.agregarItem(producto, talla, this.cantidad(), this.colorSeleccionado() ?? undefined);
    this.agregado.set(true);
    this.toastService.exito(`"${producto.nombre}" se agregó a tu bolsa.`);
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
