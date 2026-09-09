import { Producto } from '../../core/models/producto.model';

/**
 * Placeholder que mis-productos.component.ts asigna como `imagenUrl` cuando
 * el vendedor crea/edita un producto sin subir ni pegar una imagen (ver su
 * guardar()). Se expone aquí, en vez de quedar como string suelto en cada
 * archivo, porque resolverImagenProducto() necesita reconocerlo para no
 * tratarlo como si fuera una imagen real elegida por el vendedor.
 */
export const PLACEHOLDER_IMAGEN_PRODUCTO = 'https://picsum.photos/seed/nuevo/400/500';

/**
 * Imagen a mostrar para un producto en catálogo, tarjetas, carrito, checkout,
 * y los paneles de vendedor (Mis Productos/Inventario/Ofertas) — en
 * cualquier vista que no tenga ya su propia lógica de imagen por color (ver
 * producto-detalle.component.ts y agregar-carrito-modal.component.ts, que
 * cambian de foto según el color elegido y solo usan esto como imagen
 * inicial). Prioridad:
 *   1. `producto.imagenUrl` si el vendedor de verdad la asignó (no es el
 *      placeholder genérico que usa el formulario cuando no se sube nada).
 *   2. La primera foto de color real que el producto tenga subida (ver
 *      FotoColorService / "fotos por color" en mis-productos.component.ts).
 *   3. El placeholder genérico, como último recurso, para no dejar un <img>
 *      roto.
 */
export function resolverImagenProducto(producto: Pick<Producto, 'imagenUrl' | 'imagenesColores'>): string {
  const imagenAsignada = producto.imagenUrl?.trim();
  if (imagenAsignada && imagenAsignada !== PLACEHOLDER_IMAGEN_PRODUCTO) {
    return imagenAsignada;
  }

  return producto.imagenesColores?.[0]?.imagenUrl ?? PLACEHOLDER_IMAGEN_PRODUCTO;
}
