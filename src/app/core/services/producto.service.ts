import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Audiencia,
  Categoria,
  Color,
  DetalleStockInsuficiente,
  ItemStockSolicitado,
  Producto,
  ResultadoVerificacionStock,
  SIN_COLOR,
  Talla,
  VarianteStock
} from '../models/producto.model';

const CLAVE_PRODUCTOS = 'productos_data';

// Stock por defecto que reciben las variantes generadas para productos
// existentes que todavía no tenían `variantes` (datos guardados antes de que
// existiera este campo, o los productos semilla). Así el catálogo no aparece
// agotado de golpe tras esta actualización; el vendedor ajusta desde
// Inventario. Las variantes creadas explícitamente (producto nuevo, o talla/
// color agregados desde el formulario/Inventario) sí arrancan en 0: ver
// `sincronizarVariantes`.
const STOCK_POR_DEFECTO_MIGRACION = 15;

function construirVariantes(tallas: Talla[], colores: Color[], cantidad: number): VarianteStock[] {
  const coloresEfectivos = colores.length > 0 ? colores : [SIN_COLOR];
  return tallas.flatMap(talla => coloresEfectivos.map(color => ({ talla, color, cantidad })));
}

function construirStockPorTalla(tallas: Talla[], variantes: VarianteStock[]): { talla: Talla; cantidad: number }[] {
  return tallas.map(talla => ({
    talla,
    cantidad: variantes.filter(variante => variante.talla === talla).reduce((total, v) => total + v.cantidad, 0)
  }));
}

const PRODUCTOS_SEED_BASE: Omit<Producto, 'variantes' | 'stockPorTalla'>[] = [
  {
    id: 'p1',
    sku: 'FJ-PAN-001',
    nombre: 'Pantalón de Vestir Slim',
    descripcion:
      'Pantalón de corte slim confeccionado en gabardina de algodón, ideal para looks formales y de oficina.',
    precio: 899,
    categoria: 'pantalon',
    audiencia: 'hombre',
    coloresDisponibles: ['negro', 'azul'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p1/400/500',
    imagenes: [
      'https://picsum.photos/seed/p1/400/500',
      'https://picsum.photos/seed/p1-b/400/500',
      'https://picsum.photos/seed/p1-c/400/500'
    ],
    etiqueta: 'NUEVO',
    destacado: true
  },
  {
    id: 'p2',
    sku: 'FJ-PAN-002',
    nombre: 'Pantalón Chino Clásico',
    descripcion: 'Pantalón chino de algodón con corte recto, un básico versátil para el día a día.',
    precio: 749,
    categoria: 'pantalon',
    audiencia: 'nino',
    coloresDisponibles: ['beige'],
    tallasDisponibles: ['M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p2/400/500',
    imagenes: [
      'https://picsum.photos/seed/p2/400/500',
      'https://picsum.photos/seed/p2-b/400/500',
      'https://picsum.photos/seed/p2-c/400/500'
    ],
    etiqueta: 'ESENCIAL',
    destacado: false
  },
  {
    id: 'p3',
    sku: 'FJ-PAN-003',
    nombre: 'Pantalón Cargo Utility',
    descripcion: 'Pantalón cargo con bolsillos funcionales, tela resistente y ajuste cómodo.',
    precio: 999,
    categoria: 'pantalon',
    audiencia: 'hombre',
    coloresDisponibles: ['gris', 'negro'],
    tallasDisponibles: ['S', 'M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p3/400/500',
    imagenes: [
      'https://picsum.photos/seed/p3/400/500',
      'https://picsum.photos/seed/p3-b/400/500',
      'https://picsum.photos/seed/p3-c/400/500'
    ],
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p4',
    sku: 'FJ-PLA-004',
    nombre: 'Playera Básica Algodón',
    descripcion: 'Playera de algodón 100% peinado, suave al tacto y de ajuste regular.',
    precio: 349,
    categoria: 'playera',
    audiencia: 'nino',
    coloresDisponibles: ['blanco'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p4/400/500',
    imagenes: [
      'https://picsum.photos/seed/p4/400/500',
      'https://picsum.photos/seed/p4-b/400/500',
      'https://picsum.photos/seed/p4-c/400/500'
    ],
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p5',
    sku: 'FJ-PLA-005',
    nombre: 'Playera Estampada Edición Limitada',
    descripcion: 'Playera con estampado exclusivo de temporada, tela premium y acabado suave.',
    precio: 429,
    categoria: 'playera',
    audiencia: 'hombre',
    coloresDisponibles: ['azul'],
    tallasDisponibles: ['M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p5/400/500',
    imagenes: [
      'https://picsum.photos/seed/p5/400/500',
      'https://picsum.photos/seed/p5-b/400/500',
      'https://picsum.photos/seed/p5-c/400/500'
    ],
    etiqueta: 'NUEVO',
    destacado: true
  },
  {
    id: 'p6',
    sku: 'FJ-PLA-006',
    nombre: 'Playera Cuello V',
    descripcion: 'Playera con cuello en V, corte entallado y tejido transpirable.',
    precio: 379,
    categoria: 'playera',
    audiencia: 'nino',
    coloresDisponibles: ['negro', 'blanco'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p6/400/500',
    imagenes: [
      'https://picsum.photos/seed/p6/400/500',
      'https://picsum.photos/seed/p6-b/400/500',
      'https://picsum.photos/seed/p6-c/400/500'
    ],
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p7',
    sku: 'FJ-CAM-007',
    nombre: 'Camisa de Lino Manga Larga',
    descripcion: 'Camisa confeccionada en lino ligero, perfecta para climas cálidos y looks relajados.',
    precio: 1099,
    categoria: 'camisa',
    audiencia: 'hombre',
    coloresDisponibles: ['blanco'],
    tallasDisponibles: ['S', 'M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p7/400/500',
    imagenes: [
      'https://picsum.photos/seed/p7/400/500',
      'https://picsum.photos/seed/p7-b/400/500',
      'https://picsum.photos/seed/p7-c/400/500'
    ],
    etiqueta: 'NUEVO',
    destacado: false
  },
  {
    id: 'p8',
    sku: 'FJ-CAM-008',
    nombre: 'Camisa Oxford Clásica',
    descripcion: 'Camisa Oxford de algodón con cuello abotonado, un básico atemporal para el guardarropa.',
    precio: 949,
    categoria: 'camisa',
    audiencia: 'nino',
    coloresDisponibles: ['azul'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p8/400/500',
    imagenes: [
      'https://picsum.photos/seed/p8/400/500',
      'https://picsum.photos/seed/p8-b/400/500',
      'https://picsum.photos/seed/p8-c/400/500'
    ],
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p9',
    sku: 'FJ-CAM-009',
    nombre: 'Camisa a Cuadros Franela',
    descripcion: 'Camisa de franela con estampado a cuadros, cálida y de tacto suave.',
    precio: 899,
    categoria: 'camisa',
    audiencia: 'hombre',
    coloresDisponibles: ['cafe'],
    tallasDisponibles: ['M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p9/400/500',
    imagenes: [
      'https://picsum.photos/seed/p9/400/500',
      'https://picsum.photos/seed/p9-b/400/500',
      'https://picsum.photos/seed/p9-c/400/500'
    ],
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p10',
    sku: 'FJ-BER-010',
    nombre: 'Bermuda Deportiva',
    descripcion: 'Bermuda ligera de secado rápido, ideal para actividades al aire libre.',
    precio: 549,
    categoria: 'bermuda',
    audiencia: 'nino',
    coloresDisponibles: ['gris'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p10/400/500',
    imagenes: [
      'https://picsum.photos/seed/p10/400/500',
      'https://picsum.photos/seed/p10-b/400/500',
      'https://picsum.photos/seed/p10-c/400/500'
    ],
    etiqueta: 'NUEVO',
    destacado: false
  },
  {
    id: 'p11',
    sku: 'FJ-BER-011',
    nombre: 'Bermuda Denim',
    descripcion: 'Bermuda de mezclilla con corte recto y lavado clásico.',
    precio: 629,
    categoria: 'bermuda',
    audiencia: 'hombre',
    coloresDisponibles: ['azul'],
    tallasDisponibles: ['M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p11/400/500',
    imagenes: [
      'https://picsum.photos/seed/p11/400/500',
      'https://picsum.photos/seed/p11-b/400/500',
      'https://picsum.photos/seed/p11-c/400/500'
    ],
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p12',
    sku: 'FJ-BER-012',
    nombre: 'Bermuda Cargo',
    descripcion: 'Bermuda tipo cargo con bolsillos laterales y tela resistente.',
    precio: 679,
    categoria: 'bermuda',
    audiencia: 'nino',
    coloresDisponibles: ['beige', 'gris'],
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p12/400/500',
    imagenes: [
      'https://picsum.photos/seed/p12/400/500',
      'https://picsum.photos/seed/p12-b/400/500',
      'https://picsum.photos/seed/p12-c/400/500'
    ],
    etiqueta: null,
    destacado: false
  }
];

const PRODUCTOS_SEED: Producto[] = PRODUCTOS_SEED_BASE.map(producto => {
  const variantes = construirVariantes(producto.tallasDisponibles, producto.coloresDisponibles, STOCK_POR_DEFECTO_MIGRACION);
  return {
    ...producto,
    variantes,
    stockPorTalla: construirStockPorTalla(producto.tallasDisponibles, variantes)
  };
});

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private productos: Producto[] = this.leerProductosGuardados();

  obtenerTodos(): Observable<Producto[]> {
    return of(this.productos);
  }

  obtenerPorCategoria(categoria: Categoria): Observable<Producto[]> {
    return of(this.productos.filter(producto => producto.categoria === categoria));
  }

  obtenerPorAudiencia(audiencia: Audiencia, categoria?: Categoria): Observable<Producto[]> {
    return of(
      this.productos.filter(
        producto => producto.audiencia === audiencia && (!categoria || producto.categoria === categoria)
      )
    );
  }

  obtenerDestacados(): Observable<Producto[]> {
    return of(this.productos.filter(producto => producto.destacado));
  }

  obtenerPorId(id: string): Observable<Producto | undefined> {
    return of(this.productos.find(producto => producto.id === id));
  }

  buscar(termino: string): Observable<Producto[]> {
    const terminoNormalizado = termino.trim().toLowerCase();

    if (!terminoNormalizado) {
      return of([]);
    }

    return of(this.productos).pipe(
      map(productos =>
        productos.filter(producto => producto.nombre.toLowerCase().includes(terminoNormalizado))
      )
    );
  }

  crearProducto(producto: Omit<Producto, 'id' | 'sku' | 'variantes' | 'stockPorTalla'>): Observable<Producto> {
    // Las cantidades de una variante nueva arrancan en 0: "crear producto"
    // define qué tallas/colores existen, pero asignar existencias es
    // responsabilidad de la sección Inventario (ver punto 2 del pedido).
    const variantes = this.sincronizarVariantes(producto.tallasDisponibles, producto.coloresDisponibles, []);

    const nuevoProducto: Producto = {
      ...producto,
      id: `prod-${Date.now()}`,
      sku: `FJ-${producto.categoria.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
      variantes,
      stockPorTalla: construirStockPorTalla(producto.tallasDisponibles, variantes)
    };

    this.productos = [...this.productos, nuevoProducto];
    this.guardarProductos();

    return of(nuevoProducto);
  }

  actualizarProducto(id: string, cambios: Partial<Producto>): Observable<Producto> {
    this.productos = this.productos.map(producto => {
      if (producto.id !== id) {
        return producto;
      }

      const actualizado: Producto = { ...producto, ...cambios, id };
      const tocaTallasOColores = cambios.tallasDisponibles !== undefined || cambios.coloresDisponibles !== undefined;

      // Si el formulario de "Mis Productos" cambió las tallas/colores del
      // producto, las variantes se resincronizan para reflejar la nueva
      // cuadrícula talla×color, preservando la cantidad de las combinaciones
      // que ya existían (no se resetea el stock por editar otro campo).
      if (tocaTallasOColores && cambios.variantes === undefined) {
        actualizado.variantes = this.sincronizarVariantes(
          actualizado.tallasDisponibles,
          actualizado.coloresDisponibles,
          producto.variantes
        );
      }

      actualizado.stockPorTalla = construirStockPorTalla(actualizado.tallasDisponibles, actualizado.variantes);
      return actualizado;
    });
    this.guardarProductos();

    const actualizado = this.productos.find(producto => producto.id === id);
    return of(actualizado as Producto);
  }

  eliminarProducto(id: string): Observable<void> {
    this.productos = this.productos.filter(producto => producto.id !== id);
    this.guardarProductos();

    return of(undefined);
  }

  // --- Inventario: gestión de stock de productos existentes --------------

  agregarColorAProducto(productoId: string, color: Color): Observable<Producto> {
    this.productos = this.productos.map(producto => {
      if (producto.id !== productoId || producto.coloresDisponibles.includes(color)) {
        return producto;
      }

      const coloresDisponibles = [...producto.coloresDisponibles, color];
      const variantes = this.sincronizarVariantes(producto.tallasDisponibles, coloresDisponibles, producto.variantes);
      return {
        ...producto,
        coloresDisponibles,
        variantes,
        stockPorTalla: construirStockPorTalla(producto.tallasDisponibles, variantes)
      };
    });
    this.guardarProductos();

    return of(this.productos.find(producto => producto.id === productoId) as Producto);
  }

  agregarTallaAProducto(productoId: string, talla: Talla): Observable<Producto> {
    this.productos = this.productos.map(producto => {
      if (producto.id !== productoId || producto.tallasDisponibles.includes(talla)) {
        return producto;
      }

      const tallasDisponibles = [...producto.tallasDisponibles, talla];
      const variantes = this.sincronizarVariantes(tallasDisponibles, producto.coloresDisponibles, producto.variantes);
      return {
        ...producto,
        tallasDisponibles,
        variantes,
        stockPorTalla: construirStockPorTalla(tallasDisponibles, variantes)
      };
    });
    this.guardarProductos();

    return of(this.productos.find(producto => producto.id === productoId) as Producto);
  }

  actualizarStockVariante(productoId: string, talla: Talla, color: Color, cantidad: number): Observable<Producto> {
    const cantidadSegura = Math.max(0, Math.floor(cantidad) || 0);

    this.productos = this.productos.map(producto => {
      if (producto.id !== productoId) {
        return producto;
      }

      const variantes = producto.variantes.map(variante =>
        variante.talla === talla && variante.color === color ? { ...variante, cantidad: cantidadSegura } : variante
      );
      return { ...producto, variantes, stockPorTalla: construirStockPorTalla(producto.tallasDisponibles, variantes) };
    });
    this.guardarProductos();

    return of(this.productos.find(producto => producto.id === productoId) as Producto);
  }

  // --- Descuento de stock al confirmar un pedido --------------------------

  // No permite que el stock quede negativo: si alguna línea del pedido pide
  // más piezas de las disponibles en esa variante, se rechaza el pedido
  // completo (no se descuenta nada) y se informa qué líneas fallaron, para
  // que el comprador ajuste su bolsa en vez de recibir un pedido a medias.
  verificarStockDisponible(items: ItemStockSolicitado[]): ResultadoVerificacionStock {
    const detalles: DetalleStockInsuficiente[] = [];

    for (const item of items) {
      const producto = this.productos.find(p => p.id === item.productoId);
      const color = item.color ?? SIN_COLOR;
      const variante = producto?.variantes.find(v => v.talla === item.talla && v.color === color);
      const disponible = variante?.cantidad ?? 0;

      if (disponible < item.cantidad) {
        detalles.push({
          productoId: item.productoId,
          productoNombre: producto?.nombre ?? item.productoId,
          talla: item.talla,
          color,
          disponible,
          solicitado: item.cantidad
        });
      }
    }

    return detalles.length > 0 ? { ok: false, detalles } : { ok: true };
  }

  descontarStock(items: ItemStockSolicitado[]): void {
    this.productos = this.productos.map(producto => {
      const ajustes = items.filter(item => item.productoId === producto.id);
      if (ajustes.length === 0) {
        return producto;
      }

      const variantes = producto.variantes.map(variante => {
        const ajuste = ajustes.find(
          item => item.talla === variante.talla && (item.color ?? SIN_COLOR) === variante.color
        );
        return ajuste ? { ...variante, cantidad: Math.max(0, variante.cantidad - ajuste.cantidad) } : variante;
      });

      return { ...producto, variantes, stockPorTalla: construirStockPorTalla(producto.tallasDisponibles, variantes) };
    });
    this.guardarProductos();
  }

  // Reconstruye la lista de variantes para que exista exactamente una entrada
  // por cada combinación talla×color de las listas dadas, preservando la
  // cantidad de las combinaciones que ya existían en `existentes` y usando
  // `cantidadPorDefecto` (0 salvo en la migración de datos antiguos) para las
  // combinaciones nuevas.
  private sincronizarVariantes(
    tallas: Talla[],
    colores: Color[],
    existentes: VarianteStock[],
    cantidadPorDefecto = 0
  ): VarianteStock[] {
    const coloresEfectivos = colores.length > 0 ? colores : [SIN_COLOR];

    return tallas.flatMap(talla =>
      coloresEfectivos.map(color => {
        const previa = existentes.find(v => v.talla === talla && v.color === color);
        return { talla, color, cantidad: previa?.cantidad ?? cantidadPorDefecto };
      })
    );
  }

  private guardarProductos(): void {
    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(this.productos));
  }

  private leerProductosGuardados(): Producto[] {
    const guardados = localStorage.getItem(CLAVE_PRODUCTOS);

    if (guardados) {
      const productos = (JSON.parse(guardados) as Partial<Producto>[]).map(producto => {
        const seedCoincidente = PRODUCTOS_SEED.find(seed => seed.id === producto.id);
        const tallasDisponibles = producto.tallasDisponibles ?? seedCoincidente?.tallasDisponibles ?? [];
        const coloresDisponibles =
          producto.coloresDisponibles ?? seedCoincidente?.coloresDisponibles ?? ([] as Color[]);

        const base = {
          audiencia: 'hombre' as Audiencia,
          destacado: false,
          sku: seedCoincidente?.sku ?? `FJ-${(producto.id ?? 'SIN-ID').toUpperCase()}`,
          imagenes: seedCoincidente?.imagenes,
          coloresDisponibles,
          ...producto,
          tallasDisponibles
        } as Producto;

        // Migración: productos guardados antes de existir `variantes` (o con
        // el arreglo vacío) reciben stock por defecto derivado de sus tallas
        // y colores actuales, para que el catálogo no aparezca agotado de
        // golpe tras esta actualización.
        if (!base.variantes || base.variantes.length === 0) {
          base.variantes =
            seedCoincidente?.variantes && seedCoincidente.variantes.length > 0
              ? seedCoincidente.variantes
              : construirVariantes(tallasDisponibles, coloresDisponibles, STOCK_POR_DEFECTO_MIGRACION);
        }

        base.stockPorTalla = construirStockPorTalla(tallasDisponibles, base.variantes);

        return base;
      });
      localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
      return productos;
    }

    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(PRODUCTOS_SEED));
    return PRODUCTOS_SEED;
  }
}
