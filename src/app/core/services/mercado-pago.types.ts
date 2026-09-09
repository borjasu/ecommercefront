// Tipos mínimos del SDK global de Mercado Pago (cargado por <script> en
// index.html, ver mercado-pago.service.ts) — no hay paquete de tipos oficial
// para Angular, así que se declara solo lo que esta app realmente usa del
// Payment Brick (Checkout Bricks).

export interface PaymentBrickPayer {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface PaymentBrickInitialization {
  amount: number;
  preferenceId: string;
  payer?: PaymentBrickPayer;
}

export type ModoMetodoPago = 'all' | 'excluded';

export interface PaymentBrickPaymentMethods {
  creditCard?: ModoMetodoPago;
  debitCard?: ModoMetodoPago;
  ticket?: ModoMetodoPago;
  bankTransfer?: ModoMetodoPago;
  maxInstallments?: number;
}

// Variables CSS que expone el Brick para combinar con la marca — nombres tal
// cual los documenta Mercado Pago en customization.visual.style.customVariables
// (https://www.mercadopago.com.ar/developers/en/docs/checkout-bricks/additional-content/modify-css-variables).
// outline*/baseColor*Variant se incluyen a propósito: sin ellas, los estados de
// foco/hover/carga dentro del formulario del Brick caen al azul default de MP
// aunque baseColor ya esté puesto en dorado — esos estados usan variables aparte.
export interface PaymentBrickCustomVariables {
  baseColor?: string;
  baseColorFirstVariant?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  outlinePrimaryColor?: string;
  outlineSecondaryColor?: string;
  buttonTextColor?: string;
  formBackgroundColor?: string;
  borderRadiusMedium?: string;
}

export interface PaymentBrickCustomization {
  visual?: { style?: { theme?: string; customVariables?: PaymentBrickCustomVariables } };
  paymentMethods?: PaymentBrickPaymentMethods;
}

// Lo que entrega el callback onSubmit — su shape exacto varía según el
// método que el comprador eligió dentro del Brick (tarjeta/ticket/transferencia),
// por eso queda tipado como Record en vez de una interfaz cerrada: se manda
// tal cual al backend, que es quien realmente lo valida (ver procesar-pago.dto.ts).
export interface PaymentBrickSubmitData {
  selectedPaymentMethod: string;
  formData: Record<string, unknown>;
}

export interface PaymentBrickCallbacks {
  onReady?: () => void;
  onSubmit: (data: PaymentBrickSubmitData) => Promise<void>;
  onError?: (error: unknown) => void;
}

export interface PaymentBrickSettings {
  initialization: PaymentBrickInitialization;
  customization?: PaymentBrickCustomization;
  callbacks: PaymentBrickCallbacks;
}

export interface MercadoPagoBrickController {
  unmount(): void;
}

interface BricksBuilder {
  create(
    type: 'payment',
    containerId: string,
    settings: PaymentBrickSettings
  ): Promise<MercadoPagoBrickController>;
}

interface MercadoPagoInstance {
  bricks(): BricksBuilder;
}

declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}
