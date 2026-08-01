import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Oferta } from '../models/oferta.model';
import { Producto } from '../models/producto.model';

export interface PrecioConOferta {
  precioOriginal: number;
  precioFinal: number;
  porcentajeDescuento?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private readonly http = inject(HttpClient);

  obtenerTodos(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${API_URL}/ofertas`);
  }

  crearOferta(datos: Omit<Oferta, 'id'>): Observable<Oferta> {
    return this.http.post<Oferta>(`${API_URL}/ofertas`, datos);
  }

  actualizarOferta(id: string, cambios: Partial<Omit<Oferta, 'id'>>): Observable<Oferta> {
    return this.http.patch<Oferta>(`${API_URL}/ofertas/${id}`, cambios);
  }

  eliminarOferta(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/ofertas/${id}`);
  }

  /** El backend ya manda precioFinal/precioOriginal calculados en cada producto que devuelve /productos. */
  calcularPrecio(producto: Producto): PrecioConOferta {
    return {
      precioOriginal: producto.precioOriginal ?? producto.precio,
      precioFinal: producto.precioFinal ?? producto.precio,
      porcentajeDescuento: producto.porcentajeDescuento
    };
  }
}
