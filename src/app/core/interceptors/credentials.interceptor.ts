import { HttpInterceptorFn } from '@angular/common/http';
import { API_URL } from '../config/api.config';

/**
 * El backend usa cookies HttpOnly para la sesión (no localStorage/Authorization
 * header), así que toda petición a NUESTRO API necesita withCredentials:true
 * para que el navegador mande/reciba esas cookies en la petición cross-origin
 * (localhost:4200 → localhost:3000).
 *
 * Solo aplica a peticiones hacia API_URL: mandar withCredentials a un dominio
 * de terceros (p. ej. la API de Mercado Pago para tokenizar tarjeta) puede
 * hacer que ese request falle si ese dominio no permite credentials desde un
 * origin arbitrario — ahí no lo necesitamos de todos modos.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }
  return next(req.clone({ withCredentials: true }));
};
