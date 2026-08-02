import { Injectable } from '@angular/core';
import { MERCADOPAGO_PUBLIC_KEY } from '../config/api.config';
import { MercadoPagoBrickController, PaymentBrickSettings } from './mercado-pago.types';

/**
 * Wrapper del SDK global de Mercado Pago (`window.MercadoPago`, cargado por
 * <script> en index.html) — flujo oficial de Checkout Bricks: Payment Brick
 * completo (tarjeta, débito, ticket/OXXO, transferencia, wallet en un solo
 * componente), inicializado con una Preference creada en el backend.
 * https://www.mercadopago.com.mx/developers — Checkout Bricks / Payment Brick.
 */
@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  // Public Key desde config, nunca hardcodeada dentro de un componente — es
  // segura de exponer (a diferencia de la Access Token, que nunca sale del backend).
  private readonly mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY, { locale: 'es-MX' });
  private brickActual: MercadoPagoBrickController | null = null;

  async montarPaymentBrick(containerId: string, settings: PaymentBrickSettings): Promise<void> {
    // Si ya había un Brick montado (p. ej. el usuario reintentó una cotización
    // de pago o regresó/avanzó de paso), se desmonta primero — montar dos
    // veces sobre el mismo contenedor sin desmontar deja el widget duplicado/roto.
    await this.desmontarBrick();
    this.brickActual = await this.mp.bricks().create('payment', containerId, settings);
  }

  async desmontarBrick(): Promise<void> {
    this.brickActual?.unmount();
    this.brickActual = null;
  }
}
