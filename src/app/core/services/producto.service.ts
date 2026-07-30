import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Audiencia, Categoria, Color, Producto } from '../models/producto.model';

const CLAVE_PRODUCTOS = 'productos_data';

const PRODUCTOS_SEED: Producto[] = [
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

  crearProducto(producto: Omit<Producto, 'id' | 'sku'>): Observable<Producto> {
    const nuevoProducto: Producto = {
      ...producto,
      id: `prod-${Date.now()}`,
      sku: `FJ-${producto.categoria.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`
    };

    this.productos = [...this.productos, nuevoProducto];
    this.guardarProductos();

    return of(nuevoProducto);
  }

  actualizarProducto(id: string, cambios: Partial<Producto>): Observable<Producto> {
    this.productos = this.productos.map(producto =>
      producto.id === id ? { ...producto, ...cambios, id } : producto
    );
    this.guardarProductos();

    const actualizado = this.productos.find(producto => producto.id === id);
    return of(actualizado as Producto);
  }

  eliminarProducto(id: string): Observable<void> {
    this.productos = this.productos.filter(producto => producto.id !== id);
    this.guardarProductos();

    return of(undefined);
  }

  private guardarProductos(): void {
    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(this.productos));
  }

  private leerProductosGuardados(): Producto[] {
    const guardados = localStorage.getItem(CLAVE_PRODUCTOS);

    if (guardados) {
      const productos = (JSON.parse(guardados) as Partial<Producto>[]).map(producto => {
        const seedCoincidente = PRODUCTOS_SEED.find(seed => seed.id === producto.id);

        return {
          audiencia: 'hombre' as Audiencia,
          destacado: false,
          sku: seedCoincidente?.sku ?? `FJ-${(producto.id ?? 'SIN-ID').toUpperCase()}`,
          imagenes: seedCoincidente?.imagenes,
          coloresDisponibles: seedCoincidente?.coloresDisponibles ?? ([] as Color[]),
          ...producto
        } as Producto;
      });
      localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
      return productos;
    }

    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(PRODUCTOS_SEED));
    return PRODUCTOS_SEED;
  }
}
