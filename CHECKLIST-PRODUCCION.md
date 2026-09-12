# Checklist de producción — ecommerfront (Vercel)

No existía este archivo antes de esta sesión. Angular no usa `.env` — la
configuración por entorno vive en `src/environments/*.ts`
(`environment.ts` es la que se compila en `ng build --configuration
production`, la que Vercel usará).

Despliegue objetivo: Vercel, con **la URL gratuita de la plataforma**
(`*.vercel.app`) — todavía no hay dominio propio.

## Variables (`src/environments/environment.ts`)

| Variable | Valor actual | Qué debe ser en producción | Estado |
|---|---|---|---|
| `production` | `true` | `true` (sin cambios) | Ya está listo |
| `apiUrl` | `http://localhost:3000` | La URL pública real de Railway (ej. `https://tu-proyecto.up.railway.app`) — **única fuente de la que ahora dependen TODOS los servicios** (ver nota abajo) | **Depende de un trámite externo** — necesitas desplegar el backend a Railway primero para tener esta URL |
| `mercadoPagoPublicKey` | `TEST-fb713419-...` (sandbox) | La Public Key de **producción** de la cuenta real de Mercado Pago del cliente | **Depende de un trámite externo** — credenciales reales del cliente. Mientras no lleguen, el checkout seguirá funcionando pero en modo prueba (tarjetas de test, sin dinero real) |

`environment.development.ts` (la que usa `ng serve` / `--configuration
development`) se queda apuntando a `localhost:3000` a propósito — no la
toques para esto.

## Nota importante de esta sesión: `api.config.ts` ya no tiene valores propios

Antes, `src/app/core/config/api.config.ts` tenía `API_URL` y
`MERCADOPAGO_PUBLIC_KEY` como constantes **hardcodeadas** a `localhost:3000`
y una key de TEST, completamente desconectadas de `environment.ts`. Al
menos 10 archivos (`contacto.service.ts`, `favoritos.service.ts`,
`envios.service.ts`, `direcciones.service.ts`, `vendor-pedido.service.ts`,
`pedido.service.ts`, `pagos.service.ts`, `oferta.service.ts`,
`mercado-pago.service.ts`, `credentials.interceptor.ts`) importaban de ahí,
así que aunque `environment.apiUrl` estuviera bien puesto, esos 10 archivos
seguían apuntando a `localhost:3000` en producción — checkout de pagos,
cotización de envío, direcciones, favoritos, contacto y pedidos habrían
fallado por completo.

Esto ya está corregido: `api.config.ts` ahora es solo un puente
(`export const API_URL = environment.apiUrl`). **Esto significa que llenar
`environment.ts.apiUrl` con la URL de Railway es, hoy, el único paso
necesario** — ya no hay un segundo lugar que revisar. Verificado con
`grep -rn "localhost" src/` después del cambio: solo aparece en
`environment.development.ts` (correcto, es el de desarrollo) y en
comentarios.

## Antes del primer deploy a Vercel

1. Despliega primero el backend a Railway y copia su URL pública.
2. Pon esa URL en `environment.ts.apiUrl`, commitea, despliega a Vercel.
3. Copia la URL que Vercel asigna y regresa al backend: llena
   `CORS_ORIGIN`/`FRONTEND_URL` ahí con esta URL (ver
   `ecommerceback/CHECKLIST-PRODUCCION.md`) — es una dependencia circular
   entre ambos checklists, es normal necesitar un segundo redeploy de un
   lado una vez que el otro ya tiene URL.
4. Confirma que `ecommerceback` tiene `COOKIE_SAME_SITE=none` en Railway
   (frontend y backend son dominios distintos mientras no haya dominio
   propio) — si no, el login parecerá funcionar pero ninguna petición
   protegida después traerá la cookie de sesión.
5. Cuando el cliente entregue su Public Key real de Mercado Pago,
   reemplázala en `environment.ts.mercadoPagoPublicKey` antes de aceptar
   pagos reales — hasta entonces el checkout queda en modo de prueba.
