import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae un mensaje legible de un error HTTP del backend real (ver
 * HttpExceptionFilter de ecommerceback, que siempre responde `{ message }`,
 * a veces como array cuando class-validator junta varios errores de un
 * mismo DTO). Usado por las pantallas de vendedor que ya hablan con el
 * backend real (mis-productos, inventario) para no duplicar este mapeo.
 */
export function mensajeDeErrorHttp(error: HttpErrorResponse): string {
  const mensaje = error.error?.message;
  if (Array.isArray(mensaje)) {
    return mensaje.join(' ');
  }
  return mensaje ?? 'No se pudo completar la operación. Intenta de nuevo.';
}
