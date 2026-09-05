import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Color, Talla } from '../models/producto.model';

export interface ItemCotizacion {
  productoId: string;
  talla: Talla;
  color: Color;
  cantidad: number;
}

export interface OpcionEnvio {
  rateId: string;
  paqueteria: string;
  servicio: string;
  costo: number;
  tiempoEstimado: string;
}

export interface RespuestaCotizacion {
  cotizacionId: string;
  opciones: OpcionEnvio[];
}

// Cotización real contra Skydropx (ver ShippingService del backend) — el
// costo de envío ya no es un valor fijo inventado por el frontend: se cotiza
// con la dirección real y los artículos del carrito, y esa cotización
// (cotizacionId + rateId de la opción elegida) es lo que POST /pedidos vuelve
// a revalidar antes de aceptar el pedido.
@Injectable({
  providedIn: 'root'
})
export class EnvioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/envios`;

  cotizar(direccionId: string, items: ItemCotizacion[]): Observable<RespuestaCotizacion> {
    return this.http.post<RespuestaCotizacion>(
      `${this.baseUrl}/cotizar`,
      { direccionId, items },
      { withCredentials: true }
    );
  }
}
