import { HttpClient, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';

const YA_REINTENTADA = new HttpContextToken<boolean>(() => false);

// El access_token dura poco (15 min, ver cookie.util.ts) y el refresh_token 7
// días: sin este interceptor, cualquier F5 o pausa larga en la pestaña
// devuelve 401 en el primer request aunque la sesión siga vigente, porque
// nadie pide un access_token nuevo. Estos endpoints se excluyen a propósito:
// login/registro devuelven 401 por credenciales inválidas (no por sesión
// expirada) y refresh no puede intentar refrescarse a sí mismo (bucle infinito).
const ENDPOINTS_SIN_REFRESH = ['/auth/login', '/auth/registro', '/auth/refresh', '/auth/logout'];

// Estado a nivel de módulo (no de instancia) a propósito: el refresh token se
// rota en cada uso (ver auth.service.ts `refrescar`), así que si dos requests
// expiran al mismo tiempo y cada una llama /auth/refresh por su cuenta, la
// segunda falla porque la primera ya invalidó el refresh token. Este flag
// asegura una sola llamada a /auth/refresh en vuelo aunque varias peticiones
// den 401 al mismo tiempo; las demás esperan ese mismo resultado.
let refrescando = false;
const refrescoListo$ = new BehaviorSubject<boolean | null>(null);

function esEndpointExento(url: string): boolean {
  return ENDPOINTS_SIN_REFRESH.some((endpoint) => url.startsWith(`${API_URL}${endpoint}`));
}

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL) || esEndpointExento(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      const esNoAutorizado = error instanceof HttpErrorResponse && error.status === 401;
      if (!esNoAutorizado || req.context.get(YA_REINTENTADA)) {
        return throwError(() => error);
      }
      return intentarRefrescoYReintentar(req, next, error);
    }),
  );
};

function intentarRefrescoYReintentar(
  req: Parameters<HttpInterceptorFn>[0],
  next: Parameters<HttpInterceptorFn>[1],
  errorOriginal: unknown,
): Observable<never> {
  const reintentar = () => next(req.clone({ context: req.context.set(YA_REINTENTADA, true) }));

  if (refrescando) {
    return refrescoListo$.pipe(
      filter((resultado) => resultado !== null),
      take(1),
      switchMap((exito) => (exito ? reintentar() : throwError(() => errorOriginal))),
    ) as Observable<never>;
  }

  refrescando = true;
  refrescoListo$.next(null);
  const http = inject(HttpClient);

  return http.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
    switchMap(() => {
      refrescando = false;
      refrescoListo$.next(true);
      return reintentar();
    }),
    catchError(() => {
      refrescando = false;
      refrescoListo$.next(false);
      return throwError(() => errorOriginal);
    }),
  ) as Observable<never>;
}
