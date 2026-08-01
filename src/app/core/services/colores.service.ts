import { Injectable, computed, effect, signal } from '@angular/core';
import { Color } from '../models/producto.model';

export interface ColorOpcion {
  valor: Color;
  etiqueta: string;
  hex: string;
}

const CLAVE_COLORES_PERSONALIZADOS = 'colores_personalizados';

const COLORES_BASE: ColorOpcion[] = [
  { valor: 'negro', etiqueta: 'Negro', hex: '#14110d' },
  { valor: 'azul', etiqueta: 'Azul', hex: '#2b3a55' },
  { valor: 'gris', etiqueta: 'Gris', hex: '#8a8a8a' },
  { valor: 'beige', etiqueta: 'Beige', hex: '#d9c9a3' },
  { valor: 'blanco', etiqueta: 'Blanco', hex: '#f5f5f0' },
  { valor: 'cafe', etiqueta: 'Café', hex: '#6b4226' }
];

@Injectable({
  providedIn: 'root'
})
export class ColoresService {
  private readonly personalizados = signal<ColorOpcion[]>(this.leerGuardados());

  readonly listado = computed(() => [...COLORES_BASE, ...this.personalizados()]);

  constructor() {
    effect(() => {
      localStorage.setItem(CLAVE_COLORES_PERSONALIZADOS, JSON.stringify(this.personalizados()));
    });
  }

  agregarColor(etiqueta: string, hex: string): ColorOpcion {
    const nuevo: ColorOpcion = { valor: this.generarValor(etiqueta), etiqueta: etiqueta.trim(), hex };
    this.personalizados.update(actuales => [...actuales, nuevo]);
    return nuevo;
  }

  esPersonalizado(valor: Color): boolean {
    return this.personalizados().some(opcion => opcion.valor === valor);
  }

  eliminarColor(valor: Color): void {
    this.personalizados.update(actuales => actuales.filter(opcion => opcion.valor !== valor));
  }

  etiquetaDe(valor: Color): string {
    return this.listado().find(opcion => opcion.valor === valor)?.etiqueta ?? valor;
  }

  hexDe(valor: Color): string {
    return this.listado().find(opcion => opcion.valor === valor)?.hex ?? '#9c9c9c';
  }

  private generarValor(etiqueta: string): string {
    const base =
      etiqueta
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'color';

    let valor = base;
    let contador = 1;
    while (this.listado().some(opcion => opcion.valor === valor)) {
      contador += 1;
      valor = `${base}-${contador}`;
    }
    return valor;
  }

  private leerGuardados(): ColorOpcion[] {
    const guardado = localStorage.getItem(CLAVE_COLORES_PERSONALIZADOS);

    if (!guardado) {
      return [];
    }

    try {
      const colores = JSON.parse(guardado);
      return Array.isArray(colores) ? colores : [];
    } catch {
      return [];
    }
  }
}
