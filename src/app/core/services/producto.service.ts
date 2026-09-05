import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Audiencia,
  Categoria,
  Color,
  DetalleStockInsuficiente,
  Etiqueta,
  ItemStockSolicitado,
  Producto,
  ResultadoVerificacionStock,
  SIN_COLOR,
  Talla,
  VarianteStock
} from '../models/producto.model';

// ProductoService habla con el backend real (ecommerceback) para todo lo que
// el backend sí modela: datos del producto, colores/tallas disponibles,
// imagen. El backend HOY NO TIENE modelo de inventario (ni `variantes` ni
// `stockPorTalla` existen en la entidad Producto ni en ningún endpoint —
// confirmado en la auditoría del día 2, ver `orders.service.ts` y
// `producto-color-imagen.entity.ts` del backend, que documentan
// explícitamente "no hay control de stock"). Por decisión explícita del
// equipo, el stock por talla×color se sigue manejando 100% en el frontend
// (localStorage), indexado por el id REAL (uuid) que ahora devuelve el
// backend, y se combina con cada producto que llega del servidor. Esto no
// sobrevive a limpiar el localStorage del navegador ni se comparte entre
// dispositivos — es una limitación conocida hasta que el backend tenga su
// propio modelo de inventario.
const CLAVE_STOCK = 'stock_variantes_data';

// Tope máximo que acepta el backend por página (ver ListarProductosQueryDto
// del backend, LIMITE_MAXIMO=50). El catálogo/mis-productos/inventario del
// frontend siguen pidiendo "todo de una vez" y paginando/filtrando en
// cliente (igual que con el mock), así que se pide el máximo permitido en
// una sola llamada. Si el catálogo real llega a superar 50 productos activos
// hace falta agregar recorrido de páginas aquí — no aplica todavía (~12
// productos sembrados hoy).
const LIMITE_CATALOGO = 50;

// Stock por defecto que reciben las variantes de un producto que llega del
// backend real sin stock local guardado todavía (primera vez que se ve ese
// id en este navegador). Mismo criterio que tenía la migración del mock: así
// el catálogo no aparece agotado de golpe.
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

// Forma real de la respuesta del backend (ver ProductoPlano/ProductoConPrecio
// en products/producto-con-precio.mapper.ts de ecommerceback). `precio` es el
// precio base sin descuentos; el backend además manda
// precioOriginal/precioFinal/porcentajeDescuento/ofertaAplicada cuando hay una
// oferta vigente (ver OffersService), pero el frontend todavía calcula
// descuentos por su cuenta con su propio OfertaService mock (ver
// oferta.service.ts) — ambos sistemas quedan sin unificar hasta el día que se
// conecte Ofertas al backend, así que aquí se ignoran esos campos y se usa
// `precio` tal cual, igual que hacía el mock.
interface ProductoBackend {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Categoria;
  audiencia: Audiencia;
  coloresDisponibles: string[];
  tallasDisponibles: string[];
  imagenUrl: string;
  imagenes: string[] | null;
  etiqueta: Etiqueta;
  destacado: boolean;
  activo: boolean;
}

interface PaginaProductosBackend {
  data: ProductoBackend[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  private stockLocal: Record<string, VarianteStock[]> = this.leerStockGuardado();

  // Cache best-effort id→nombre (se llena cada vez que se mapea un producto
  // real) usada solo para que los mensajes de "stock insuficiente" en el
  // checkout puedan mostrar el nombre del producto sin depender de mantener
  // en memoria el catálogo completo (ver verificarStockDisponible).
  private nombresPorId: Record<string, string> = {};

  obtenerTodos(): Observable<Producto[]> {
    return this.http
      .get<PaginaProductosBackend>(this.baseUrl, { params: { limit: LIMITE_CATALOGO } })
      .pipe(map(pagina => pagina.data.map(p => this.aProducto(p))));
  }

  obtenerPorCategoria(categoria: Categoria): Observable<Producto[]> {
    return this.http
      .get<PaginaProductosBackend>(this.baseUrl, { params: { categoria, limit: LIMITE_CATALOGO } })
      .pipe(map(pagina => pagina.data.map(p => this.aProducto(p))));
  }

  obtenerPorAudiencia(audiencia: Audiencia, categoria?: Categoria): Observable<Producto[]> {
    const params: Record<string, string | number> = { audiencia, limit: LIMITE_CATALOGO };
    if (categoria) {
      params['categoria'] = categoria;
    }
    return this.http
      .get<PaginaProductosBackend>(this.baseUrl, { params })
      .pipe(map(pagina => pagina.data.map(p => this.aProducto(p))));
  }

  obtenerDestacados(): Observable<Producto[]> {
    return this.http
      .get<ProductoBackend[]>(`${this.baseUrl}/destacados`)
      .pipe(map(productos => productos.map(p => this.aProducto(p))));
  }

  obtenerPorId(id: string): Observable<Producto | undefined> {
    return this.http.get<ProductoBackend>(`${this.baseUrl}/${id}`).pipe(
      map(p => this.aProducto(p)),
      // Igual que el mock (que nunca rechazaba la promesa/observable): un id
      // inexistente o inválido se resuelve como "no encontrado", nunca como
      // error — así producto-detalle.component.ts no necesita cambiar cómo
      // consume esto.
      catchError(() => of(undefined))
    );
  }

  buscar(termino: string): Observable<Producto[]> {
    const q = termino.trim();

    if (!q) {
      return of([]);
    }

    return this.http
      .get<PaginaProductosBackend>(`${this.baseUrl}/buscar`, { params: { q, limit: LIMITE_CATALOGO } })
      .pipe(map(pagina => pagina.data.map(p => this.aProducto(p))));
  }

  crearProducto(producto: Omit<Producto, 'id' | 'sku' | 'stockPorTalla'>): Observable<Producto> {
    return this.http
      .post<ProductoBackend>(this.baseUrl, this.aPayloadBackend(producto), { withCredentials: true })
      .pipe(
        map(creado => {
          // El formulario de "Nuevo producto" ya captura el stock inicial por
          // talla/color (ver mis-productos.component.ts): si vino con
          // variantes se respeta tal cual; si no, arrancan en 0.
          const variantes =
            producto.variantes.length > 0
              ? producto.variantes
              : this.sincronizarVariantes(creado.tallasDisponibles, creado.coloresDisponibles, []);
          this.guardarStockDe(creado.id, variantes);
          return this.aProducto(creado, variantes);
        })
      );
  }

  actualizarProducto(id: string, cambios: Partial<Producto>): Observable<Producto> {
    return this.http.patch<ProductoBackend>(`${this.baseUrl}/${id}`, this.aPayloadBackend(cambios), {
      withCredentials: true
    }).pipe(
      map(actualizado => {
        let variantes: VarianteStock[];
        if (cambios.variantes !== undefined) {
          variantes = cambios.variantes;
        } else if (cambios.tallasDisponibles !== undefined || cambios.coloresDisponibles !== undefined) {
          // Cambiaron tallas/colores sin mandar variantes explícitas: se
          // resincroniza la cuadrícula talla×color preservando las
          // cantidades que ya existían, igual que hacía el mock.
          variantes = this.sincronizarVariantes(
            actualizado.tallasDisponibles,
            actualizado.coloresDisponibles,
            this.stockDe(id)
          );
        } else {
          variantes = this.stockDe(id);
        }
        this.guardarStockDe(id, variantes);
        return this.aProducto(actualizado, variantes);
      })
    );
  }

  eliminarProducto(id: string): Observable<void> {
    // Borrado lógico en el backend (activo=false) — desaparece del catálogo
    // público de inmediato. El stock local del id se limpia también, ya no
    // tiene caso conservarlo.
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(tap(() => this.borrarStockDe(id)));
  }

  // --- Inventario: gestión de stock de productos existentes --------------

  agregarColorAProducto(productoId: string, color: Color): Observable<Producto> {
    return this.http.get<ProductoBackend>(`${this.baseUrl}/${productoId}`).pipe(
      switchMap(actual => {
        if (actual.coloresDisponibles.includes(color)) {
          return of(actual);
        }
        const coloresDisponibles = [...actual.coloresDisponibles, color];
        return this.http.patch<ProductoBackend>(
          `${this.baseUrl}/${productoId}`,
          { coloresDisponibles },
          { withCredentials: true }
        );
      }),
      map(actualizado => {
        const variantes = this.sincronizarVariantes(
          actualizado.tallasDisponibles,
          actualizado.coloresDisponibles,
          this.stockDe(productoId)
        );
        this.guardarStockDe(productoId, variantes);
        return this.aProducto(actualizado, variantes);
      })
    );
  }

  agregarTallaAProducto(productoId: string, talla: Talla): Observable<Producto> {
    return this.http.get<ProductoBackend>(`${this.baseUrl}/${productoId}`).pipe(
      switchMap(actual => {
        if (actual.tallasDisponibles.includes(talla)) {
          return of(actual);
        }
        const tallasDisponibles = [...actual.tallasDisponibles, talla];
        return this.http.patch<ProductoBackend>(
          `${this.baseUrl}/${productoId}`,
          { tallasDisponibles },
          { withCredentials: true }
        );
      }),
      map(actualizado => {
        const variantes = this.sincronizarVariantes(
          actualizado.tallasDisponibles,
          actualizado.coloresDisponibles,
          this.stockDe(productoId)
        );
        this.guardarStockDe(productoId, variantes);
        return this.aProducto(actualizado, variantes);
      })
    );
  }

  // Cantidades: 100% local (ver nota de cabecera), no requiere red — se
  // conserva como Observable para no romper la firma que ya consume
  // inventario.component.ts.
  actualizarStockVariante(productoId: string, talla: Talla, color: Color, cantidad: number): Observable<Producto> {
    const cantidadSegura = Math.max(0, Math.floor(cantidad) || 0);
    const variantes = this.stockDe(productoId).map(variante =>
      variante.talla === talla && variante.color === color ? { ...variante, cantidad: cantidadSegura } : variante
    );
    this.guardarStockDe(productoId, variantes);

    // obtenerPorId nunca rechaza (un id inexistente resuelve `undefined`, ver
    // su propio comentario) — aquí sí nos interesa distinguir esa falla del
    // caso feliz, para que inventario.component.ts la muestre como error en
    // vez de intentar leer `.id` de `undefined`.
    return this.obtenerPorId(productoId).pipe(
      switchMap(producto =>
        producto ? of(producto) : throwError(() => new Error('No se pudo recargar el producto actualizado.'))
      )
    );
  }

  // --- Descuento de stock al confirmar un pedido (100% local) -------------

  // No permite que el stock quede negativo: si alguna línea del pedido pide
  // más piezas de las disponibles en esa variante, se rechaza el pedido
  // completo (no se descuenta nada) y se informa qué líneas fallaron.
  verificarStockDisponible(items: ItemStockSolicitado[]): ResultadoVerificacionStock {
    const detalles: DetalleStockInsuficiente[] = [];

    for (const item of items) {
      const color = item.color ?? SIN_COLOR;
      const variante = this.stockDe(item.productoId).find(v => v.talla === item.talla && v.color === color);
      const disponible = variante?.cantidad ?? 0;

      if (disponible < item.cantidad) {
        detalles.push({
          productoId: item.productoId,
          productoNombre: this.nombresPorId[item.productoId] ?? item.productoId,
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
    for (const item of items) {
      const color = item.color ?? SIN_COLOR;
      const variantes = this.stockDe(item.productoId).map(variante =>
        variante.talla === item.talla && variante.color === color
          ? { ...variante, cantidad: Math.max(0, variante.cantidad - item.cantidad) }
          : variante
      );
      this.guardarStockDe(item.productoId, variantes);
    }
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

  private aProducto(p: ProductoBackend, variantesConocidas?: VarianteStock[]): Producto {
    this.nombresPorId[p.id] = p.nombre;

    const variantes = variantesConocidas ?? this.obtenerOInicializarStock(p.id, p.tallasDisponibles, p.coloresDisponibles);

    return {
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      audiencia: p.audiencia,
      coloresDisponibles: p.coloresDisponibles,
      tallasDisponibles: p.tallasDisponibles,
      variantes,
      imagenUrl: p.imagenUrl,
      imagenes: p.imagenes ?? undefined,
      etiqueta: p.etiqueta,
      destacado: p.destacado,
      stockPorTalla: construirStockPorTalla(p.tallasDisponibles, variantes)
    };
  }

  private obtenerOInicializarStock(id: string, tallas: Talla[], colores: Color[]): VarianteStock[] {
    const existente = this.stockLocal[id];
    const variantes = existente
      ? this.sincronizarVariantes(tallas, colores, existente)
      : construirVariantes(tallas, colores, STOCK_POR_DEFECTO_MIGRACION);

    this.guardarStockDe(id, variantes);
    return variantes;
  }

  // Solo lo que el backend real entiende (ver CrearProductoDto/
  // ActualizarProductoDto de ecommerceback) — variantes/stockPorTalla/
  // coloresGenerados/id/sku nunca se mandan, el backend los ignoraría o los
  // rechazaría.
  private aPayloadBackend(producto: Partial<Producto>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (producto.nombre !== undefined) payload['nombre'] = producto.nombre;
    if (producto.descripcion !== undefined) payload['descripcion'] = producto.descripcion;
    if (producto.precio !== undefined) payload['precio'] = producto.precio;
    if (producto.categoria !== undefined) payload['categoria'] = producto.categoria;
    if (producto.audiencia !== undefined) payload['audiencia'] = producto.audiencia;
    if (producto.coloresDisponibles !== undefined) payload['coloresDisponibles'] = producto.coloresDisponibles;
    if (producto.tallasDisponibles !== undefined) payload['tallasDisponibles'] = producto.tallasDisponibles;
    if (producto.imagenUrl !== undefined) payload['imagenUrl'] = producto.imagenUrl;
    if (producto.imagenes !== undefined) payload['imagenes'] = producto.imagenes;
    if (producto.etiqueta !== undefined) payload['etiqueta'] = producto.etiqueta;
    if (producto.destacado !== undefined) payload['destacado'] = producto.destacado;

    return payload;
  }

  private stockDe(id: string): VarianteStock[] {
    return this.stockLocal[id] ?? [];
  }

  private guardarStockDe(id: string, variantes: VarianteStock[]): void {
    this.stockLocal = { ...this.stockLocal, [id]: variantes };
    localStorage.setItem(CLAVE_STOCK, JSON.stringify(this.stockLocal));
  }

  private borrarStockDe(id: string): void {
    const { [id]: _eliminado, ...resto } = this.stockLocal;
    this.stockLocal = resto;
    localStorage.setItem(CLAVE_STOCK, JSON.stringify(this.stockLocal));
  }

  private leerStockGuardado(): Record<string, VarianteStock[]> {
    const guardado = localStorage.getItem(CLAVE_STOCK);

    if (!guardado) {
      return {};
    }

    try {
      const stock = JSON.parse(guardado);
      return stock && typeof stock === 'object' ? stock : {};
    } catch {
      return {};
    }
  }
}
