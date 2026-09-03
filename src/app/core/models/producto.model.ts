export type Categoria = 'pantalon' | 'playera' | 'camisa' | 'bermuda';
export type Talla = string;
export type Etiqueta = 'NUEVO' | 'ESENCIAL' | null;
export type Audiencia = 'hombre' | 'nino';
export type Color = string;

// Sentinel usado como "color" de las variantes de un producto que no maneja
// colores (coloresDisponibles vacío). Así el desglose de stock por talla+color
// sigue funcionando con una sola columna implícita, sin volver `color` opcional
// en VarianteStock ni repartir lógica especial por todo el código.
export const SIN_COLOR: Color = '';

// Stock real de una combinación talla+color de un producto. `variantes` es la
// fuente de verdad del inventario; `tallasDisponibles`/`coloresDisponibles` se
// mantienen para no romper componentes existentes y se sincronizan con las
// variantes desde ProductoService cada vez que cambian.
export interface VarianteStock {
  talla: Talla;
  color: Color;
  cantidad: number;
}

// Imagen generada por el algoritmo de recoloreo del backend (ver
// RecoloreoService en ecommerceback) para un color específico de un
// producto. `nombreColor` es texto libre elegido por el vendedor al
// generarla (no necesariamente coincide con un valor de `coloresDisponibles`
// del catálogo) — el emparejamiento con el swatch de color que el comprador
// selecciona se hace por nombre, case-insensitive (ver producto-detalle y
// agregar-carrito-modal).
export interface ColorGenerado {
  id: string;
  nombreColor: string;
  colorHex: string;
  imagenUrl: string;
}

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Categoria;
  audiencia: Audiencia;
  coloresDisponibles: Color[];
  tallasDisponibles: Talla[];
  variantes: VarianteStock[];
  imagenUrl: string;
  imagenes?: string[];
  etiqueta?: Etiqueta;
  destacado: boolean;
  // Derivado de `variantes` (suma de cantidades por talla, ignorando color) por
  // ProductoService. No es la fuente de verdad: existe para que cualquier
  // vista que ya leyera este campo de forma defensiva (ver OfertasComponent)
  // reciba datos reales ahora que el stock por talla existe.
  stockPorTalla?: { talla: Talla; cantidad: number }[];
  // Opcional: productos mock existentes (todo el CRUD de "Mis Productos" hoy
  // no habla con el backend real) simplemente no traen este campo. Se llena
  // desde el backend real vía RecoloreoService (frontend) cuando el vendedor
  // genera colores para un producto que sí existe ahí.
  coloresGenerados?: ColorGenerado[];
}

// --- Descuento de stock al confirmar un pedido ---------------------------

export interface ItemStockSolicitado {
  productoId: string;
  talla: Talla;
  color?: Color;
  cantidad: number;
}

export interface DetalleStockInsuficiente {
  productoId: string;
  productoNombre: string;
  talla: Talla;
  color: Color;
  disponible: number;
  solicitado: number;
}

export type ResultadoVerificacionStock =
  | { ok: true }
  | { ok: false; detalles: DetalleStockInsuficiente[] };
