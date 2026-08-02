import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from '../config/api.config';
import { ResultadoPago, RespuestaPreferencia } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private readonly http = inject(HttpClient);

  /**
   * Flujo oficial de Checkout Bricks: primero se crea la Preference en el
   * backend (con el pedido ya guardado) y con eso se inicializa el Payment
   * Brick en el frontend — el backend nunca acepta un monto que venga del
   * cliente, siempre lee el total real del Pedido.
   */
  crearPreferencia(pedidoId: string): Observable<RespuestaPreferencia> {
    return this.http.post<RespuestaPreferencia>(`${API_URL}/pagos/crear-preferencia`, { pedidoId });
  }

  /**
   * Manda tal cual el `formData` que entrega el callback onSubmit del Payment
   * Brick (más el pedidoId, que el Brick no incluye) — nunca pasa por aquí un
   * número de tarjeta ni CVV: el Brick los tokeniza él mismo dentro de su
   * propio iframe, este servicio nunca los ve.
   */
  procesar(pedidoId: string, formData: Record<string, unknown>): Observable<ResultadoPago> {
    return this.http
      .post<{ resultado: ResultadoPago }>(`${API_URL}/pagos/procesar`, { ...formData, pedidoId })
      .pipe(map(respuesta => respuesta.resultado));
  }
}
