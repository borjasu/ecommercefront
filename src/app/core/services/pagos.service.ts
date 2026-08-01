import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL, MERCADOPAGO_PUBLIC_KEY } from '../config/api.config';
import { DatosTarjeta, ResultadoPago } from '../models/pago.model';

const MERCADOPAGO_TOKENS_URL = 'https://api.mercadopago.com/v1/card_tokens';

interface RespuestaTokenTarjeta {
  id: string;
  first_six_digits: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private readonly http = inject(HttpClient);

  /**
   * Tokeniza la tarjeta directo contra la API de Mercado Pago, sin pasar por
   * nuestro backend — así nuestro servidor nunca ve número de tarjeta, CVV ni
   * fecha de expiración. Solo el token resultante viaja a /pagos/procesar.
   */
  tokenizarTarjeta(datos: DatosTarjeta): Observable<string> {
    const body = {
      card_number: datos.numero.replace(/\s+/g, ''),
      expiration_month: Number(datos.mesVencimiento),
      expiration_year: Number(datos.anioVencimiento),
      security_code: datos.cvv,
      cardholder: { name: datos.nombreTitular }
    };

    return this.http
      .post<RespuestaTokenTarjeta>(`${MERCADOPAGO_TOKENS_URL}?public_key=${MERCADOPAGO_PUBLIC_KEY}`, body)
      .pipe(map(respuesta => respuesta.id));
  }

  procesar(pedidoId: string, token: string, paymentMethodId: string, installments = 1): Observable<ResultadoPago> {
    return this.http
      .post<{ resultado: ResultadoPago }>(`${API_URL}/pagos/procesar`, { pedidoId, token, paymentMethodId, installments })
      .pipe(map(respuesta => respuesta.resultado));
  }
}
