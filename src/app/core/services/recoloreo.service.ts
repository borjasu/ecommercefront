import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ColorGenerado } from '../models/producto.model';

// Único servicio del frontend que habla con el backend real (ver
// app.config.ts: primer/único provideHttpClient del proyecto). El resto del
// CRUD de productos (ProductoService, ColoresService, etc.) sigue siendo
// mock/localStorage — ver resumen de la feature de recoloreo para el porqué.
// `withCredentials: true` es obligatorio: el JWT del vendedor viaja en una
// cookie HttpOnly cross-origin (el backend ya tiene `credentials: true` en
// CORS para esto).
@Injectable({ providedIn: 'root' })
export class RecoloreoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  generarColor(
    productoId: string,
    nombreColor: string,
    colorHex: string
  ): Observable<ColorGenerado> {
    return this.http.post<ColorGenerado>(
      `${this.baseUrl}/${productoId}/colores`,
      { nombreColor, colorHex },
      { withCredentials: true }
    );
  }

  eliminarColor(productoId: string, colorId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productoId}/colores/${colorId}`, {
      withCredentials: true
    });
  }
}
