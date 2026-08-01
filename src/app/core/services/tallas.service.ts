import { Injectable, computed, effect, signal } from '@angular/core';
import { Talla } from '../models/producto.model';

const CLAVE_TALLAS_PERSONALIZADAS = 'tallas_personalizadas';

const TALLAS_BASE: Talla[] = ['S', 'M', 'L', 'XL'];

// Acepta tallas de letra (XS, S, M, L, XL, XXL, XXXL, 2XL-9XL) o numéricas de 1 a 3
// dígitos (cintura/largo de mezclilla, calzado infantil, etc.). Cualquier otro texto
// se rechaza para evitar tallas sin sentido en el catálogo.
const REGEX_TALLA_VALIDA = /^(XS|S|M|L|X{1,3}L|[2-9]XL|[0-9]{1,3})$/;

export type ResultadoAgregarTalla =
  | { ok: true; talla: Talla }
  | { ok: false; motivo: 'invalida' | 'duplicada' };

@Injectable({
  providedIn: 'root'
})
export class TallasService {
  private readonly personalizadas = signal<Talla[]>(this.leerGuardadas());

  readonly listado = computed(() => [...TALLAS_BASE, ...this.personalizadas()]);

  constructor() {
    effect(() => {
      localStorage.setItem(CLAVE_TALLAS_PERSONALIZADAS, JSON.stringify(this.personalizadas()));
    });
  }

  agregarTalla(valor: string): ResultadoAgregarTalla {
    const normalizada = valor.trim().toUpperCase();

    if (!REGEX_TALLA_VALIDA.test(normalizada)) {
      return { ok: false, motivo: 'invalida' };
    }

    if (this.listado().includes(normalizada)) {
      return { ok: false, motivo: 'duplicada' };
    }

    this.personalizadas.update(actuales => [...actuales, normalizada]);
    return { ok: true, talla: normalizada };
  }

  esPersonalizada(valor: Talla): boolean {
    return this.personalizadas().includes(valor);
  }

  eliminarTalla(valor: Talla): void {
    this.personalizadas.update(actuales => actuales.filter(talla => talla !== valor));
  }

  private leerGuardadas(): Talla[] {
    const guardado = localStorage.getItem(CLAVE_TALLAS_PERSONALIZADAS);

    if (!guardado) {
      return [];
    }

    try {
      const tallas = JSON.parse(guardado);
      return Array.isArray(tallas) ? tallas : [];
    } catch {
      return [];
    }
  }
}
