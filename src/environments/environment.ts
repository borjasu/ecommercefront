// Configuración de producción por defecto (reemplazada por
// environment.development.ts en `ng serve`/`ng build --configuration development`,
// ver angular.json → architect.build.configurations.development.fileReplacements).
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000',
  // Llave PÚBLICA de Mercado Pago (par de MERCADOPAGO_ACCESS_TOKEN, que es
  // privada y solo vive en el backend) — está pensada para viajar al cliente,
  // se usa para inicializar el SDK JS del Payment Brick (ver
  // checkout.component.ts). Modo TEST: tarjetas de prueba, sin dinero real.
  mercadoPagoPublicKey: 'TEST-fb713419-72cb-4fad-81f6-fe70bc07b8a1'
};
