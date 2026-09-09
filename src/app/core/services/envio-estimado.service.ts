import { Injectable, inject, signal } from '@angular/core';
import { EnviosService } from './envios.service';
import { ItemParaCotizar, OpcionEnvio } from '../models/envio.model';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const DEBOUNCE_MS = 800; // agrupa cambios rápidos de cantidad en una sola cotización

export interface EnvioEstimado {
  opcion: OpcionEnvio;
  ciudad: string;
}

/**
 * Cache del estimado de envío del carrito a nivel de servicio (no de
 * componente): sobrevive a que el usuario navegue fuera de /carrito y
 * regrese dentro de la misma sesión de la app — sin esto, cada vez que se
 * recrea CarritoComponent se perdía el cache y se volvía a cotizar aunque
 * nada hubiera cambiado. No bloquea el render: el consumidor (CarritoComponent)
 * muestra el carrito de inmediato y solo lee `cargando`/`estimado` para un
 * bloque aparte que se actualiza cuando llegue.
 */
@Injectable({
  providedIn: 'root'
})
export class EnvioEstimadoService {
  private readonly enviosService = inject(EnviosService);

  readonly cargando = signal(false);
  readonly estimado = signal<EnvioEstimado | null>(null);
  readonly error = signal(false);

  private cacheCantidad: number | null = null;
  private cacheDireccionId: string | null = null;
  private cacheExpiraEn = 0;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  /** Sin dirección/usuario/carrito válidos, limpia el estimado (no se muestra nada). */
  limpiar(): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
    this.estimado.set(null);
    this.error.set(false);
    this.cacheCantidad = null;
  }

  solicitar(direccionId: string, ciudad: string, items: ItemParaCotizar[], cantidadTotal: number): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = setTimeout(
      () => this.cotizarSiHaceFalta(direccionId, ciudad, items, cantidadTotal),
      DEBOUNCE_MS
    );
  }

  private cotizarSiHaceFalta(
    direccionId: string,
    ciudad: string,
    items: ItemParaCotizar[],
    cantidadTotal: number
  ): void {
    const cacheVigente =
      this.cacheCantidad === cantidadTotal &&
      this.cacheDireccionId === direccionId &&
      Date.now() < this.cacheExpiraEn;

    if (cacheVigente) {
      return;
    }

    this.cargando.set(true);
    this.error.set(false);

    this.enviosService.cotizar(direccionId, items).subscribe({
      next: respuesta => {
        const masBarata = [...respuesta.opciones].sort((a, b) => a.costo - b.costo)[0] ?? null;
        this.estimado.set(masBarata ? { opcion: masBarata, ciudad } : null);
        this.cacheCantidad = cantidadTotal;
        this.cacheDireccionId = direccionId;
        this.cacheExpiraEn = Date.now() + CACHE_TTL_MS;
        this.cargando.set(false);
      },
      error: () => {
        this.estimado.set(null);
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }
}
