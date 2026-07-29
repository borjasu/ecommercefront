import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Audiencia, Categoria, Producto } from '../models/producto.model';

const CLAVE_PRODUCTOS = 'productos_data';

const PRODUCTOS_SEED: Producto[] = [
  {
    id: 'p1',
    nombre: 'Pantalón de Vestir Slim',
    descripcion:
      'Pantalón de corte slim confeccionado en gabardina de algodón, ideal para looks formales y de oficina.',
    precio: 899,
    categoria: 'pantalon',
    audiencia: 'hombre',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p1/400/500',
    etiqueta: 'NUEVO',
    destacado: true
  },
  {
    id: 'p2',
    nombre: 'Pantalón Chino Clásico',
    descripcion: 'Pantalón chino de algodón con corte recto, un básico versátil para el día a día.',
    precio: 749,
    categoria: 'pantalon',
    audiencia: 'nino',
    tallasDisponibles: ['M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p2/400/500',
    etiqueta: 'ESENCIAL',
    destacado: false
  },
  {
    id: 'p3',
    nombre: 'Pantalón Cargo Utility',
    descripcion: 'Pantalón cargo con bolsillos funcionales, tela resistente y ajuste cómodo.',
    precio: 999,
    categoria: 'pantalon',
    audiencia: 'hombre',
    tallasDisponibles: ['S', 'M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p3/400/500',
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p4',
    nombre: 'Playera Básica Algodón',
    descripcion: 'Playera de algodón 100% peinado, suave al tacto y de ajuste regular.',
    precio: 349,
    categoria: 'playera',
    audiencia: 'nino',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p4/400/500',
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p5',
    nombre: 'Playera Estampada Edición Limitada',
    descripcion: 'Playera con estampado exclusivo de temporada, tela premium y acabado suave.',
    precio: 429,
    categoria: 'playera',
    audiencia: 'hombre',
    tallasDisponibles: ['M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p5/400/500',
    etiqueta: 'NUEVO',
    destacado: true
  },
  {
    id: 'p6',
    nombre: 'Playera Cuello V',
    descripcion: 'Playera con cuello en V, corte entallado y tejido transpirable.',
    precio: 379,
    categoria: 'playera',
    audiencia: 'nino',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p6/400/500',
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p7',
    nombre: 'Camisa de Lino Manga Larga',
    descripcion: 'Camisa confeccionada en lino ligero, perfecta para climas cálidos y looks relajados.',
    precio: 1099,
    categoria: 'camisa',
    audiencia: 'hombre',
    tallasDisponibles: ['S', 'M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p7/400/500',
    etiqueta: 'NUEVO',
    destacado: false
  },
  {
    id: 'p8',
    nombre: 'Camisa Oxford Clásica',
    descripcion: 'Camisa Oxford de algodón con cuello abotonado, un básico atemporal para el guardarropa.',
    precio: 949,
    categoria: 'camisa',
    audiencia: 'nino',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p8/400/500',
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p9',
    nombre: 'Camisa a Cuadros Franela',
    descripcion: 'Camisa de franela con estampado a cuadros, cálida y de tacto suave.',
    precio: 899,
    categoria: 'camisa',
    audiencia: 'hombre',
    tallasDisponibles: ['M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p9/400/500',
    etiqueta: null,
    destacado: false
  },
  {
    id: 'p10',
    nombre: 'Bermuda Deportiva',
    descripcion: 'Bermuda ligera de secado rápido, ideal para actividades al aire libre.',
    precio: 549,
    categoria: 'bermuda',
    audiencia: 'nino',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p10/400/500',
    etiqueta: 'NUEVO',
    destacado: false
  },
  {
    id: 'p11',
    nombre: 'Bermuda Denim',
    descripcion: 'Bermuda de mezclilla con corte recto y lavado clásico.',
    precio: 629,
    categoria: 'bermuda',
    audiencia: 'hombre',
    tallasDisponibles: ['M', 'L'],
    imagenUrl: 'https://picsum.photos/seed/p11/400/500',
    etiqueta: 'ESENCIAL',
    destacado: true
  },
  {
    id: 'p12',
    nombre: 'Bermuda Cargo',
    descripcion: 'Bermuda tipo cargo con bolsillos laterales y tela resistente.',
    precio: 679,
    categoria: 'bermuda',
    audiencia: 'nino',
    tallasDisponibles: ['S', 'M', 'L', 'XL'],
    imagenUrl: 'https://picsum.photos/seed/p12/400/500',
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

  crearProducto(producto: Omit<Producto, 'id'>): Observable<Producto> {
    const nuevoProducto: Producto = {
      ...producto,
      id: `prod-${Date.now()}`
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
      const productos = (JSON.parse(guardados) as Partial<Producto>[]).map(
        producto =>
          ({
            audiencia: 'hombre' as Audiencia,
            destacado: false,
            ...producto
          }) as Producto
      );
      localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
      return productos;
    }

    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(PRODUCTOS_SEED));
    return PRODUCTOS_SEED;
  }
}
