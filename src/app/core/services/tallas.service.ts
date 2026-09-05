import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Talla } from '../models/producto.model';

// Nombres sembrados junto con el backend (ver database/seeds/seed.ts) —
// protegidos de borrado accidental desde este panel, igual que antes con las
// "tallas base" del mock.
const TALLAS_BASE: Talla[] = ['S', 'M', 'L', 'XL'];

// Acepta tallas de letra (XS, S, M, L, XL, XXL, XXXL, 2XL-9XL) o numéricas de
// 1 a 3 dígitos — mismo criterio que el backend no valida (solo exige
// longitud), así que la validación de formato se mantiene en el cliente para
// no permitir tallas sin sentido en el catálogo.
const REGEX_TALLA_VALIDA = /^(XS|S|M|L|X{1,3}L|[2-9]XL|[0-9]{1,3})$/;

export type ResultadoAgregarTalla =
  | { ok: true; talla: Talla }
  | { ok: false; motivo: 'invalida' | 'duplicada' };

// Forma real de /tallas (ver entities/talla.entity.ts de ecommerceback):
// además de `nombre` trae `orden`, que es lo que decide el orden de
// despliegue (S/M/L/XL...) en vez del alfabético.
interface TallaBackend {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TallasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tallas`;

  private readonly tallasBackend = signal<TallaBackend[]>([]);

  readonly listado = computed<Talla[]>(() =>
    [...this.tallasBackend()].sort((a, b) => a.orden - b.orden).map(talla => talla.nombre)
  );

  constructor() {
    this.recargar();
  }

  agregarTalla(valor: string): Observable<ResultadoAgregarTalla> {
    const normalizada = valor.trim().toUpperCase();

    if (!REGEX_TALLA_VALIDA.test(normalizada)) {
      return of<ResultadoAgregarTalla>({ ok: false, motivo: 'invalida' });
    }

    if (this.listado().includes(normalizada)) {
      return of<ResultadoAgregarTalla>({ ok: false, motivo: 'duplicada' });
    }

    // `orden` es obligatorio para el backend (ver CrearTallaDto) — se agrega
    // siempre al final de las que ya existen.
    const ordenSiguiente = this.tallasBackend().reduce((maximo, talla) => Math.max(maximo, talla.orden), 0) + 1;

    return this.http
      .post<TallaBackend>(this.baseUrl, { nombre: normalizada, orden: ordenSiguiente }, { withCredentials: true })
      .pipe(
        tap(nueva => this.tallasBackend.update(actuales => [...actuales, nueva])),
        map(nueva => ({ ok: true, talla: nueva.nombre }) as ResultadoAgregarTalla),
        // Condición de carrera improbable (otra pestaña agregó la misma
        // talla justo antes): el backend responde 409, se reporta como
        // duplicada en vez de propagar el error crudo. Cualquier otro error
        // (401 por sesión vencida, 500, red caída) sí se deja propagar — de
        // lo contrario el vendedor vería "esa talla ya existe" ante una falla
        // que no tiene nada que ver con eso.
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            return of<ResultadoAgregarTalla>({ ok: false, motivo: 'duplicada' });
          }
          return throwError(() => error);
        })
      );
  }

  esPersonalizada(valor: Talla): boolean {
    return !TALLAS_BASE.includes(valor);
  }

  eliminarTalla(valor: Talla): Observable<void> {
    const talla = this.tallasBackend().find(t => t.nombre === valor);
    if (!talla) {
      return throwError(() => new Error('Talla no encontrada.'));
    }

    return this.http
      .delete<void>(`${this.baseUrl}/${talla.id}`, { withCredentials: true })
      .pipe(tap(() => this.tallasBackend.update(actuales => actuales.filter(t => t.id !== talla.id))));
  }

  private recargar(): void {
    this.http.get<TallaBackend[]>(this.baseUrl).subscribe({
      next: tallas => this.tallasBackend.set(tallas),
      error: () => this.tallasBackend.set([])
    });
  }
}
