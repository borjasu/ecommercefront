import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { delay, interval } from 'rxjs';
import { ProductoService } from '../../core/services/producto.service';
import { SelectorProductoModalService } from '../../core/services/selector-producto-modal.service';
import { Producto } from '../../core/models/producto.model';

const ITEMS_VISIBLES = 3;
const INTERVALO_CARRUSEL_MS = 5000;
const DURACION_TRANSICION_MS = 500;
const RETRASO_CARGA_MS = 400;

@Component({
    selector: 'app-home',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './home.component.html'
})
export class HomeComponent {
  private readonly productoService = inject(ProductoService);
  private readonly modalService = inject(SelectorProductoModalService);

  readonly destacados = signal<Producto[]>([]);
  readonly cargandoDestacados = signal(true);
  readonly indice = signal(ITEMS_VISIBLES);
  readonly transicionActiva = signal(true);

  readonly hayLoop = computed(() => this.destacados().length > ITEMS_VISIBLES);

  readonly pista = computed<Producto[]>(() => {
    const lista = this.destacados();
    if (!this.hayLoop()) {
      return lista;
    }
    return [...lista.slice(-ITEMS_VISIBLES), ...lista, ...lista.slice(0, ITEMS_VISIBLES)];
  });

  readonly desplazamiento = computed(() => `${-(this.indice() * (100 / ITEMS_VISIBLES))}%`);

  constructor() {
    this.productoService
      .obtenerDestacados()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe(productos => {
        this.destacados.set(productos);
        this.indice.set(ITEMS_VISIBLES);
        this.cargandoDestacados.set(false);
      });

    interval(INTERVALO_CARRUSEL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.siguiente());
  }

  siguiente(): void {
    if (!this.hayLoop()) {
      return;
    }

    this.transicionActiva.set(true);
    this.indice.update(i => i + 1);

    const total = this.destacados().length;
    if (this.indice() === ITEMS_VISIBLES + total) {
      setTimeout(() => {
        this.transicionActiva.set(false);
        this.indice.set(ITEMS_VISIBLES);
      }, DURACION_TRANSICION_MS);
    }
  }

  abrirModal(producto: Producto): void {
    this.modalService.abrir(producto);
  }

  anterior(): void {
    if (!this.hayLoop()) {
      return;
    }

    this.transicionActiva.set(true);
    this.indice.update(i => i - 1);

    if (this.indice() === ITEMS_VISIBLES - 1) {
      const total = this.destacados().length;
      setTimeout(() => {
        this.transicionActiva.set(false);
        this.indice.set(ITEMS_VISIBLES + total - 1);
      }, DURACION_TRANSICION_MS);
    }
  }
}
