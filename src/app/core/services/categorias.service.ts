import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { mensajeDeErrorHttp } from '../../shared/utils/http-error.util';

export interface CategoriaOpcion {
  id: string;
  valor: string;
  etiqueta: string;
  icono: string;
  orden: number;
}

// Forma real de /categorias (ver entities/categoria.entity.ts de
// ecommerceback): `nombre` es el único identificador de texto — igual que
// Color, `valor`/`etiqueta` son el mismo string salvo para las categorías
// base (ver ETIQUETAS_BASE, para no perder los acentos que sí tenía el
// enum/mock original).
interface CategoriaBackend {
  id: string;
  nombre: string;
  icono: string;
  orden: number;
}

const ETIQUETAS_BASE: Record<string, string> = {
  pantalon: 'Pantalón',
  playera: 'Playera',
  camisa: 'Camisa',
  bermuda: 'Bermuda'
};

export type ResultadoAgregarCategoria =
  | { ok: true; categoria: CategoriaOpcion }
  | { ok: false; motivo: 'duplicada' };

export type ResultadoEliminarCategoria = { ok: true } | { ok: false; mensaje: string };

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categorias`;

  // Se carga una vez al instanciar el servicio (singleton `providedIn: 'root'`)
  // y se mantiene en memoria, actualizándose con cada agregar/eliminar — mismo
  // patrón que ColoresService/TallasService.
  private readonly categoriasBackend = signal<CategoriaBackend[]>([]);

  readonly listado = computed<CategoriaOpcion[]>(() =>
    [...this.categoriasBackend()].sort((a, b) => a.orden - b.orden).map(categoria => this.aOpcion(categoria))
  );

  constructor() {
    this.recargar();
  }

  esPersonalizada(valor: string): boolean {
    return !(valor in ETIQUETAS_BASE);
  }

  etiquetaDe(valor: string): string {
    return this.listado().find(opcion => opcion.valor === valor)?.etiqueta ?? valor;
  }

  iconoDe(valor: string): string {
    return this.listado().find(opcion => opcion.valor === valor)?.icono ?? 'accesorio';
  }

  agregarCategoria(nombre: string, icono: string): Observable<ResultadoAgregarCategoria> {
    const nombreLimpio = nombre.trim();

    if (this.listado().some(opcion => opcion.valor.toLowerCase() === nombreLimpio.toLowerCase())) {
      return of<ResultadoAgregarCategoria>({ ok: false, motivo: 'duplicada' });
    }

    // `orden` es obligatorio para el backend (ver CrearCategoriaDto) — se
    // agrega siempre al final de las que ya existen, mismo criterio que
    // TallasService.agregarTalla.
    const ordenSiguiente = this.categoriasBackend().reduce((maximo, c) => Math.max(maximo, c.orden), 0) + 1;

    return this.http
      .post<CategoriaBackend>(this.baseUrl, { nombre: nombreLimpio, icono, orden: ordenSiguiente }, { withCredentials: true })
      .pipe(
        tap(nueva => this.categoriasBackend.update(actuales => [...actuales, nueva])),
        map(nueva => ({ ok: true, categoria: this.aOpcion(nueva) }) as ResultadoAgregarCategoria),
        // Condición de carrera improbable (otra pestaña agregó la misma
        // categoría justo antes): el backend responde 409, se reporta como
        // duplicada en vez de propagar el error crudo.
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            return of<ResultadoAgregarCategoria>({ ok: false, motivo: 'duplicada' });
          }
          return throwError(() => error);
        })
      );
  }

  // A diferencia de eliminarColor/eliminarTalla (borrado lógico, nunca
  // fallan), esto SÍ puede rechazarse — el backend responde 400 con un
  // mensaje claro si hay productos usando la categoría (ver
  // CategoriasService.eliminar de ecommerceback).
  eliminarCategoria(id: string): Observable<ResultadoEliminarCategoria> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true }).pipe(
      tap(() => this.categoriasBackend.update(actuales => actuales.filter(c => c.id !== id))),
      map(() => ({ ok: true }) as ResultadoEliminarCategoria),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 400) {
          return of<ResultadoEliminarCategoria>({ ok: false, mensaje: mensajeDeErrorHttp(error) });
        }
        return throwError(() => error);
      })
    );
  }

  private recargar(): void {
    // Público, sin auth (GET /categorias) — igual que colores/tallas,
    // cualquiera lo puede leer (catálogo, menú, formulario de producto).
    this.http.get<CategoriaBackend[]>(this.baseUrl).subscribe({
      next: categorias => this.categoriasBackend.set(categorias),
      error: () => this.categoriasBackend.set([])
    });
  }

  private aOpcion(categoria: CategoriaBackend): CategoriaOpcion {
    return {
      id: categoria.id,
      valor: categoria.nombre,
      etiqueta: ETIQUETAS_BASE[categoria.nombre] ?? categoria.nombre,
      icono: categoria.icono,
      orden: categoria.orden
    };
  }
}
