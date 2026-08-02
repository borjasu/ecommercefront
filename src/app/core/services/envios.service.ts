import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { ItemParaCotizar, RespuestaCotizacion } from '../models/envio.model';

@Injectable({
  providedIn: 'root'
})
export class EnviosService {
  private readonly http = inject(HttpClient);

  /**
   * La cotización real contra Skydropx tarda varios segundos (hace polling
   * esperando respuesta de las paqueterías) — el componente que llame a esto
   * debe mostrar un estado de carga, no es instantáneo como el resto del mock.
   */
  cotizar(direccionId: string, items: ItemParaCotizar[]): Observable<RespuestaCotizacion> {
    return this.http.post<RespuestaCotizacion>(`${API_URL}/envios/cotizar`, { direccionId, items });
  }
}
