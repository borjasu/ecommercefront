import { Color, Producto, Talla } from '../../core/models/producto.model';

// Reglas de "agotado" para los selectores de talla/color del comprador
// (producto-detalle y agregar-carrito-modal). Talla y color se eligen de
// forma independiente (no hay un selector de color por talla en el diseño
// actual), así que la disponibilidad se recalcula dinámicamente según lo que
// ya esté elegido:
//  - Sin nada elegido todavía: una opción se ve agotada solo si TODAS sus
//    combinaciones posibles están en 0 (p. ej. una talla sin stock en ningún
//    color).
//  - Con la otra dimensión ya elegida: se evalúa solo esa combinación exacta.
// Si el producto no trae `variantes` (no debería pasar tras la migración en
// ProductoService, pero por robustez) no se bloquea nada.

export function tallaAgotada(producto: Producto, talla: Talla, colorSeleccionado: Color | null): boolean {
  const variantes = producto.variantes ?? [];
  const relevantes = colorSeleccionado
    ? variantes.filter(v => v.talla === talla && v.color === colorSeleccionado)
    : variantes.filter(v => v.talla === talla);

  return relevantes.length > 0 && relevantes.every(v => v.cantidad <= 0);
}

export function colorAgotado(producto: Producto, color: Color, tallaSeleccionada: Talla | null): boolean {
  const variantes = producto.variantes ?? [];
  const relevantes = tallaSeleccionada
    ? variantes.filter(v => v.color === color && v.talla === tallaSeleccionada)
    : variantes.filter(v => v.color === color);

  return relevantes.length > 0 && relevantes.every(v => v.cantidad <= 0);
}
