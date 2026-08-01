import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Audiencia, Categoria, Producto } from '../models/producto.model';

// El catálogo hoy tiene unas cuantas decenas de productos: pedimos el límite
// máximo que permite el backend (50) y tratamos la respuesta como si fuera la
// lista completa, igual que hacía el mock. Cuando el catálogo crezca más allá
// de eso, esto necesita paginación real en vez de "traer todo de una".
const LIMITE_MAXIMO = 50;

interface PaginaDeProductos {
  data: Producto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly http = inject(HttpClient);

  obtenerTodos(): Observable<Producto[]> {
    return this.obtenerPagina(new HttpParams().set('limit', LIMITE_MAXIMO));
  }

  obtenerPorCategoria(categoria: Categoria): Observable<Producto[]> {
    return this.obtenerPagina(new HttpParams().set('categoria', categoria).set('limit', LIMITE_MAXIMO));
  }

  obtenerPorAudiencia(audiencia: Audiencia, categoria?: Categoria): Observable<Producto[]> {
    let params = new HttpParams().set('audiencia', audiencia).set('limit', LIMITE_MAXIMO);
    if (categoria) {
      params = params.set('categoria', categoria);
    }
    return this.obtenerPagina(params);
  }

  obtenerDestacados(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${API_URL}/productos/destacados`);
  }

  obtenerPorId(id: string): Observable<Producto | undefined> {
    return this.http.get<Producto>(`${API_URL}/productos/${id}`).pipe(catchError(() => of(undefined)));
  }

  buscar(termino: string): Observable<Producto[]> {
    const terminoLimpio = termino.trim();
    if (!terminoLimpio) {
      return of([]);
    }

    const params = new HttpParams().set('q', terminoLimpio).set('limit', LIMITE_MAXIMO);
    return this.obtenerPagina(params, 'buscar');
  }

  crearProducto(producto: Omit<Producto, 'id' | 'sku'>): Observable<Producto> {
    return this.http.post<Producto>(`${API_URL}/productos`, producto);
  }

  actualizarProducto(id: string, cambios: Partial<Producto>): Observable<Producto> {
    return this.http.patch<Producto>(`${API_URL}/productos/${id}`, cambios);
  }

  eliminarProducto(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/productos/${id}`);
  }

  private obtenerPagina(params: HttpParams, ruta: '' | 'buscar' = ''): Observable<Producto[]> {
    const url = ruta ? `${API_URL}/productos/${ruta}` : `${API_URL}/productos`;
    return this.http.get<PaginaDeProductos>(url, { params }).pipe(map(pagina => pagina.data));
  }
}
