// Lista cerrada de íconos que una categoría puede usar — debe coincidir
// exactamente con ICONOS_CATEGORIA_VALIDOS del backend (ver
// modules/catalogos/constants/iconos-categoria.ts de ecommerceback), mismo
// criterio que CATEGORIAS/AUDIENCIAS: se duplica entre frontend/backend sin
// paquete compartido. El proyecto no usa ninguna librería de íconos (todo es
// SVG inline a mano, ver shared/components/icono-categoria) así que esta
// lista es also la que alimenta el selector visual de íconos del formulario
// de "Mis Productos".
export interface IconoCategoriaOpcion {
  valor: string;
  etiqueta: string;
}

export const ICONOS_CATEGORIA: IconoCategoriaOpcion[] = [
  { valor: 'pantalon', etiqueta: 'Pantalón' },
  { valor: 'playera', etiqueta: 'Playera' },
  { valor: 'camisa', etiqueta: 'Camisa' },
  { valor: 'bermuda', etiqueta: 'Bermuda' },
  { valor: 'chamarra', etiqueta: 'Chamarra' },
  { valor: 'sudadera', etiqueta: 'Sudadera' },
  { valor: 'calcetines', etiqueta: 'Calcetines' },
  { valor: 'gorra', etiqueta: 'Gorra' },
  { valor: 'cinturon', etiqueta: 'Cinturón' },
  { valor: 'zapatos', etiqueta: 'Zapatos' },
  { valor: 'ropa_interior', etiqueta: 'Ropa interior' },
  { valor: 'traje_bano', etiqueta: 'Traje de baño' },
  { valor: 'pijama', etiqueta: 'Pijama' },
  { valor: 'accesorio', etiqueta: 'Accesorio' }
];
