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
