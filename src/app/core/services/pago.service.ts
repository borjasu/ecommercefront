import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ResultadoPago = 'aprobado' | 'pendiente' | 'rechazado';

export interface RespuestaPreferencia {
  preferenceId: string;
  amount: number;
}

export interface RespuestaProcesarPago {
  resultado: ResultadoPago;
}

// Espeja el `formData` que entrega el callback `onSubmit` del Payment Brick
// de Mercado Pago (ver checkout.component.ts) tal cual, más `pedidoId` que el
// Brick no incluye. Todos los campos salvo los obligatorios varían según el
// método que el comprador eligió dentro del Brick (tarjeta vs ticket/OXXO) —
// mismo criterio que ProcesarPagoDto en el backend.
export interface PayerFormData {
  email: string;
  identification?: { type: string; number: string };
  first_name?: string;
  last_name?: string;
}

export interface ProcesarPagoPayload {
  pedidoId: string;
  transaction_amount: number;
  payment_method_id: string;
  token?: string;
  installments?: number;
  issuer_id?: string;
  payer: PayerFormData;
}

// Checkout Bricks (Payment Brick + Preference) — NO Checkout Pro: no hay
// redirección a una página de Mercado Pago, el formulario de pago vive
// embebido en el paso 3 del checkout. Ver PaymentsController/PaymentsService
// del backend para el detalle completo del flujo.
@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pagos`;

  // Se llama con el pedido YA creado (POST /pedidos) — la Preference que
  // inicializa el Payment Brick necesita el pedido real (items, total) para
  // armar sus líneas y back_urls.
  crearPreferencia(pedidoId: string): Observable<RespuestaPreferencia> {
    return this.http.post<RespuestaPreferencia>(
      `${this.baseUrl}/crear-preferencia`,
      { pedidoId },
      { withCredentials: true }
    );
  }

  // Resultado síncrono e inmediato para dar feedback al comprador en el
  // momento — la confirmación DEFINITIVA de `estadoPago` la escribe el
  // webhook (ver PagoService en el backend). Por eso, tras esta llamada,
  // checkout.component.ts siempre vuelve a consultar el pedido contra el
  // backend antes de reflejar cualquier estado como final.
  procesar(payload: ProcesarPagoPayload): Observable<RespuestaProcesarPago> {
    return this.http.post<RespuestaProcesarPago>(`${this.baseUrl}/procesar`, payload, { withCredentials: true });
  }
}
