import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Marca una petición para que, si el intento de refresco automático de abajo
 * también falla, el interceptor NO redirija a /login. Solo la usa
 * AuthService.inicializarSesion() (la verificación silenciosa de sesión al
 * cargar la app): ahí un 401 solo significa "todavía nadie ha iniciado
 * sesión en este navegador", no una sesión real que se acaba de cerrar, así
 * que no tiene sentido mandar a un visitante anónimo a /login.
 */
export const OMITIR_REDIRECCION_AL_EXPIRAR = new HttpContextToken<boolean>(() => false);

// Nunca reintentar sobre estas rutas: login/registro fallidos son errores de
// negocio normales (credenciales inválidas, correo duplicado), no sesiones
// expiradas; y reintentar /auth/refresh con otro /auth/refresh sería un bucle.
const RUTAS_SIN_REINTENTO = ['/auth/login', '/auth/registro', '/auth/refresh'];

/**
 * Renovación silenciosa de sesión. El access token dura 15 minutos
 * (JWT_ACCESS_EXPIRES_IN en el backend), así que CUALQUIER petición
 * autenticada puede recibir un 401 solo porque expiró a la mitad de la
 * sesión real de 7 días (JWT_REFRESH_EXPIRES_IN). Antes de tratar eso como
 * "sesión terminada", se intenta una vez POST /auth/refresh (usa la cookie
 * httpOnly refresh_token) y, si sale bien, se reintenta la petición
 * original — transparente para quien esté usando la app. Solo si el
 * refresh también falla se considera la sesión realmente terminada.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (RUTAS_SIN_REINTENTO.some(ruta => req.url.includes(ruta))) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refrescarSesion().pipe(
        switchMap(() => next(req)),
        catchError(() => {
          // El refresh también falló: la sesión de 7 días ya terminó de
          // verdad (o nunca existió). Se limpia el estado local; el logout
          // en el backend ya no aplica porque el refresh token ya es inválido.
          authService.cerrarSesionLocal();

          if (!req.context.get(OMITIR_REDIRECCION_AL_EXPIRAR)) {
            router.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
          }

          return throwError(() => error);
        })
      );
    })
  );
};
