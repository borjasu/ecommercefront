import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Color } from '../models/producto.model';

export interface ColorOpcion {
  valor: Color;
  etiqueta: string;
  hex: string;
}

// Forma real de /colores (ver entities/color.entity.ts de ecommerceback):
// `nombre` es el único identificador de texto que existe — no hay un slug
// separado como en el catálogo mock anterior, así que `valor`/`etiqueta`
// abajo ahora son el mismo string salvo para los colores base (ver
// ETIQUETAS_BASE, para no perder los acentos/mayúsculas que sí tenía el mock).
interface ColorBackend {
  id: string;
  nombre: string;
  valorHex: string | null;
  activo: boolean;
}

const HEX_POR_DEFECTO = '#9c9c9c';

// Nombres sembrados junto con el backend (ver database/seeds/seed.ts) — se
// protegen de borrado accidental desde este panel (igual que antes con los
// "colores base" del mock) y se les da una etiqueta bonita, ya que el
// backend solo guarda el nombre en minúsculas/sin acentos.
const ETIQUETAS_BASE: Record<string, string> = {
  negro: 'Negro',
  azul: 'Azul',
  gris: 'Gris',
  beige: 'Beige',
  blanco: 'Blanco',
  cafe: 'Café'
};

@Injectable({
  providedIn: 'root'
})
export class ColoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/colores`;

  // Se carga una vez al instanciar el servicio (singleton `providedIn:
  // 'root'`) y se mantiene en memoria, actualizándose con cada
  // agregar/eliminar — mismo patrón que RecoloreoService/AuthService para
  // hablar con el backend real. `listado` es un signal de solo lectura para
  // no romper a los componentes que ya lo consumen así (catalogo, carrito,
  // checkout, mis-productos, inventario, producto-detalle).
  private readonly coloresBackend = signal<ColorBackend[]>([]);

  readonly listado = computed<ColorOpcion[]>(() => this.coloresBackend().map(color => this.aOpcion(color)));

  constructor() {
    this.recargar();
  }

  agregarColor(etiqueta: string, hex: string): Observable<ColorOpcion> {
    return this.http
      .post<ColorBackend>(this.baseUrl, { nombre: etiqueta.trim(), valorHex: hex }, { withCredentials: true })
      .pipe(
        tap(nuevo => this.coloresBackend.update(actuales => [...actuales, nuevo])),
        map(nuevo => this.aOpcion(nuevo))
      );
  }

  esPersonalizado(valor: Color): boolean {
    return !(valor in ETIQUETAS_BASE);
  }

  eliminarColor(valor: Color): Observable<void> {
    const color = this.coloresBackend().find(c => c.nombre === valor);
    if (!color) {
      return throwError(() => new Error('Color no encontrado.'));
    }

    return this.http
      .delete<void>(`${this.baseUrl}/${color.id}`, { withCredentials: true })
      .pipe(tap(() => this.coloresBackend.update(actuales => actuales.filter(c => c.id !== color.id))));
  }

  etiquetaDe(valor: Color): string {
    return this.listado().find(opcion => opcion.valor === valor)?.etiqueta ?? valor;
  }

  hexDe(valor: Color): string {
    return this.listado().find(opcion => opcion.valor === valor)?.hex ?? HEX_POR_DEFECTO;
  }

  private recargar(): void {
    // Público, sin auth (GET /colores solo trae los activos) — igual que el
    // catálogo de productos, cualquiera lo puede leer.
    this.http.get<ColorBackend[]>(this.baseUrl).subscribe({
      next: colores => this.coloresBackend.set(colores),
      error: () => this.coloresBackend.set([])
    });
  }

  private aOpcion(color: ColorBackend): ColorOpcion {
    return {
      valor: color.nombre,
      etiqueta: ETIQUETAS_BASE[color.nombre] ?? color.nombre,
      hex: color.valorHex ?? HEX_POR_DEFECTO
    };
  }
}
