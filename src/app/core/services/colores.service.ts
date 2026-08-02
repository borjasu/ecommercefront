import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Color } from '../models/producto.model';

export interface ColorOpcion {
  valor: Color;
  etiqueta: string;
  hex: string;
}

interface ColorApi {
  id: string;
  nombre: string;
  valorHex: string | null;
  activo: boolean;
}

const HEX_FALLBACK = '#9c9c9c';

@Injectable({
  providedIn: 'root'
})
export class ColoresService {
  private readonly http = inject(HttpClient);

  private readonly colores = signal<ColorOpcion[]>([]);

  readonly listado = this.colores.asReadonly();

  // Catálogo dinámico (backend real, ver modules/catalogos) — público y casi
  // estático, se carga una sola vez por sesión de la app (el servicio es
  // providedIn: 'root', no depende del login).
  constructor() {
    this.http.get<ColorApi[]>(`${API_URL}/colores`).subscribe(colores => {
      this.colores.set(
        colores.map(color => ({
          valor: color.nombre,
          etiqueta: this.capitalizar(color.nombre),
          hex: color.valorHex ?? HEX_FALLBACK
        }))
      );
    });
  }

  etiquetaDe(valor: Color): string {
    return this.colores().find(opcion => opcion.valor === valor)?.etiqueta ?? valor;
  }

  hexDe(valor: Color): string {
    return this.colores().find(opcion => opcion.valor === valor)?.hex ?? HEX_FALLBACK;
  }

  private capitalizar(texto: string): string {
    return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  }
}
