import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Talla } from '../models/producto.model';

interface TallaApi {
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

  private readonly tallas = signal<Talla[]>([]);

  readonly listado = this.tallas.asReadonly();

  // El backend ya ordena por `orden` (S/M/L/XL...), no hace falta reordenar aquí.
  constructor() {
    this.http.get<TallaApi[]>(`${API_URL}/tallas`).subscribe(tallas => {
      this.tallas.set(tallas.map(talla => talla.nombre));
    });
  }
}
