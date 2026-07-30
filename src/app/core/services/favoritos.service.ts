import { Injectable, computed, effect, signal } from '@angular/core';

const CLAVE_FAVORITOS = 'favoritos_ids';

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private readonly ids = signal<Set<string>>(this.leerGuardados());

  readonly cantidad = computed(() => this.ids().size);

  constructor() {
    effect(() => {
      localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([...this.ids()]));
    });
  }

  esFavorito(productoId: string): boolean {
    return this.ids().has(productoId);
  }

  alternar(productoId: string): void {
    this.ids.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(productoId)) {
        nuevo.delete(productoId);
      } else {
        nuevo.add(productoId);
      }
      return nuevo;
    });
  }

  private leerGuardados(): Set<string> {
    const guardado = localStorage.getItem(CLAVE_FAVORITOS);

    if (!guardado) {
      return new Set();
    }

    try {
      const ids = JSON.parse(guardado);
      return Array.isArray(ids) ? new Set(ids) : new Set();
    } catch {
      return new Set();
    }
  }
}
