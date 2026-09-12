import { environment } from '../../../environments/environment';

// Puente hacia environment.ts/environment.development.ts — antes estas dos
// constantes tenían sus propios valores literales fijos a localhost:3000 y a
// una key de TEST, completamente desconectados de environment (ver auditoría
// de producción). Servicios como credentials.interceptor.ts, pagos.service.ts,
// direcciones.service.ts, etc. siguen importando de aquí; ahora ambos sistemas
// son uno solo en vez de dos en paralelo.
export const API_URL = environment.apiUrl;

// La Public Key de Mercado Pago SÍ es segura de exponer en el frontend — es la
// única credencial pensada para eso, se usa para tokenizar la tarjeta directo
// contra la API de Mercado Pago (nunca pasa por nuestro backend).
export const MERCADOPAGO_PUBLIC_KEY = environment.mercadoPagoPublicKey;
