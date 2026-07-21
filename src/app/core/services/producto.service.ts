import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Categoria, Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly productos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Pantalón de Vestir Slim',
      descripcion:
        'Pantalón de corte slim confeccionado en gabardina de algodón, ideal para looks formales y de oficina.',
      precio: 899,
      categoria: 'pantalon',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p1/400/500',
      etiqueta: 'NUEVO'
    },
    {
      id: 'p2',
      nombre: 'Pantalón Chino Clásico',
      descripcion: 'Pantalón chino de algodón con corte recto, un básico versátil para el día a día.',
      precio: 749,
      categoria: 'pantalon',
      tallasDisponibles: ['M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p2/400/500',
      etiqueta: 'ESENCIAL'
    },
    {
      id: 'p3',
      nombre: 'Pantalón Cargo Utility',
      descripcion: 'Pantalón cargo con bolsillos funcionales, tela resistente y ajuste cómodo.',
      precio: 999,
      categoria: 'pantalon',
      tallasDisponibles: ['S', 'M', 'L'],
      imagenUrl: 'https://picsum.photos/seed/p3/400/500',
      etiqueta: null
    },
    {
      id: 'p4',
      nombre: 'Playera Básica Algodón',
      descripcion: 'Playera de algodón 100% peinado, suave al tacto y de ajuste regular.',
      precio: 349,
      categoria: 'playera',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p4/400/500',
      etiqueta: 'ESENCIAL'
    },
    {
      id: 'p5',
      nombre: 'Playera Estampada Edición Limitada',
      descripcion: 'Playera con estampado exclusivo de temporada, tela premium y acabado suave.',
      precio: 429,
      categoria: 'playera',
      tallasDisponibles: ['M', 'L'],
      imagenUrl: 'https://picsum.photos/seed/p5/400/500',
      etiqueta: 'NUEVO'
    },
    {
      id: 'p6',
      nombre: 'Playera Cuello V',
      descripcion: 'Playera con cuello en V, corte entallado y tejido transpirable.',
      precio: 379,
      categoria: 'playera',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p6/400/500',
      etiqueta: null
    },
    {
      id: 'p7',
      nombre: 'Camisa de Lino Manga Larga',
      descripcion: 'Camisa confeccionada en lino ligero, perfecta para climas cálidos y looks relajados.',
      precio: 1099,
      categoria: 'camisa',
      tallasDisponibles: ['S', 'M', 'L'],
      imagenUrl: 'https://picsum.photos/seed/p7/400/500',
      etiqueta: 'NUEVO'
    },
    {
      id: 'p8',
      nombre: 'Camisa Oxford Clásica',
      descripcion: 'Camisa Oxford de algodón con cuello abotonado, un básico atemporal para el guardarropa.',
      precio: 949,
      categoria: 'camisa',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p8/400/500',
      etiqueta: 'ESENCIAL'
    },
    {
      id: 'p9',
      nombre: 'Camisa a Cuadros Franela',
      descripcion: 'Camisa de franela con estampado a cuadros, cálida y de tacto suave.',
      precio: 899,
      categoria: 'camisa',
      tallasDisponibles: ['M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p9/400/500',
      etiqueta: null
    },
    {
      id: 'p10',
      nombre: 'Bermuda Deportiva',
      descripcion: 'Bermuda ligera de secado rápido, ideal para actividades al aire libre.',
      precio: 549,
      categoria: 'bermuda',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p10/400/500',
      etiqueta: 'NUEVO'
    },
    {
      id: 'p11',
      nombre: 'Bermuda Denim',
      descripcion: 'Bermuda de mezclilla con corte recto y lavado clásico.',
      precio: 629,
      categoria: 'bermuda',
      tallasDisponibles: ['M', 'L'],
      imagenUrl: 'https://picsum.photos/seed/p11/400/500',
      etiqueta: 'ESENCIAL'
    },
    {
      id: 'p12',
      nombre: 'Bermuda Cargo',
      descripcion: 'Bermuda tipo cargo con bolsillos laterales y tela resistente.',
      precio: 679,
      categoria: 'bermuda',
      tallasDisponibles: ['S', 'M', 'L', 'XL'],
      imagenUrl: 'https://picsum.photos/seed/p12/400/500',
      etiqueta: null
    }
  ];

  obtenerTodos(): Observable<Producto[]> {
    return of(this.productos);
  }

  obtenerPorCategoria(categoria: Categoria): Observable<Producto[]> {
    return of(this.productos.filter(producto => producto.categoria === categoria));
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
}
