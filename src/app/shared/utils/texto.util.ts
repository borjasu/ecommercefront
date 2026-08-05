/**
 * Deja solo dígitos y recorta a `maxLength` caracteres. Se usa en los campos
 * de teléfono (checkout, direcciones, datos personales): `type="tel"` no
 * bloquea letras al escribir (solo es una pista de teclado en móvil), así que
 * sin esto se podían escribir letras y el error solo aparecía hasta validar
 * el formulario. Filtrar en cada tecleo evita que la letra llegue a mostrarse.
 */
export function soloDigitos(valor: string, maxLength: number): string {
  return valor.replace(/\D/g, '').slice(0, maxLength);
}

/**
 * Formatea un vencimiento de tarjeta como "MM/AA" insertando la diagonal
 * automáticamente conforme se escriben los 4 dígitos, en vez de exigir que el
 * usuario la teclee él mismo.
 */
export function formatearVencimientoTarjeta(valor: string): string {
  const digitos = soloDigitos(valor, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

/**
 * Formatea un número de tarjeta como "0000 0000 0000 0000" (16 dígitos en
 * grupos de 4), igual al formato del placeholder — solo dígitos, nada de
 * letras ni de escribir los espacios a mano.
 */
export function formatearNumeroTarjeta(valor: string): string {
  const digitos = soloDigitos(valor, 16);
  return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}
