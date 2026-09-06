import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImagenColorProducto } from '../models/producto.model';

// Habla con el backend real (ver ProductoColorImagenesService en
// ecommerceback) para subir/eliminar la foto real de un color de un
// producto — reemplaza al recoloreo algorítmico que hacía esto mismo con
// RecoloreoService. `withCredentials: true` es obligatorio: el JWT del
// vendedor viaja en una cookie HttpOnly cross-origin.
@Injectable({ providedIn: 'root' })
export class FotoColorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  // multipart/form-data, no JSON: el backend recibe la foto vía
  // FileInterceptor('foto') (ver vendor-products.controller.ts). El
  // Content-Type con boundary lo pone el navegador solo al ver un FormData en
  // el body — nunca se fija a mano, si no el boundary real no coincide con
  // el que Angular cree que mandó.
  subirFoto(
    productoId: string,
    nombreColor: string,
    colorHex: string,
    archivo: File
  ): Observable<ImagenColorProducto> {
    const formData = new FormData();
    formData.append('nombreColor', nombreColor);
    formData.append('colorHex', colorHex);
    formData.append('foto', archivo);

    return this.http.post<ImagenColorProducto>(`${this.baseUrl}/${productoId}/colores`, formData, {
      withCredentials: true
    });
  }

  eliminarFoto(productoId: string, colorId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productoId}/colores/${colorId}`, {
      withCredentials: true
    });
  }
}
