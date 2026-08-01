import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Oferta } from '../models/oferta.model';
import { Producto } from '../models/producto.model';

const CLAVE_OFERTAS = 'ofertas_data';

export interface PrecioConOferta {
  precioOriginal: number;
  precioFinal: number;
  oferta?: Oferta;
  porcentajeDescuento?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private ofertas: Oferta[] = this.leerOfertasGuardadas();

  obtenerTodos(): Observable<Oferta[]> {
    return of(this.ofertas);
  }

  obtenerPorId(id: string): Observable<Oferta | undefined> {
    return of(this.ofertas.find(oferta => oferta.id === id));
  }

  crearOferta(datos: Omit<Oferta, 'id'>): Observable<Oferta> {
    const nuevaOferta: Oferta = {
      ...datos,
      id: `oferta-${Date.now()}`
    };

    this.ofertas = [...this.ofertas, nuevaOferta];
    this.guardarOfertas();

    return of(nuevaOferta);
  }

  actualizarOferta(id: string, cambios: Partial<Oferta>): Observable<Oferta> {
    this.ofertas = this.ofertas.map(oferta => (oferta.id === id ? { ...oferta, ...cambios, id } : oferta));
    this.guardarOfertas();

    const actualizada = this.ofertas.find(oferta => oferta.id === id);
    return of(actualizada as Oferta);
  }

  eliminarOferta(id: string): Observable<void> {
    this.ofertas = this.ofertas.filter(oferta => oferta.id !== id);
    this.guardarOfertas();

    return of(undefined);
  }

  /** Busca, entre las ofertas activas y vigentes, la que aplica al producto y da el mayor descuento. */
  ofertaVigenteParaProducto(producto: Producto): Oferta | undefined {
    const ahora = new Date();

    const aplicables = this.ofertas.filter(oferta => {
      if (!oferta.activa) {
        return false;
      }

      const inicio = new Date(oferta.fechaInicio);
      const fin = new Date(oferta.fechaFin);
      fin.setHours(23, 59, 59, 999);
      if (ahora < inicio || ahora > fin) {
        return false;
      }

      if (oferta.productosAplicables.length > 0) {
        return oferta.productosAplicables.includes(producto.id);
      }

      const coincideCategoria = !oferta.categoriaAplicable || oferta.categoriaAplicable === producto.categoria;
      const coincideAudiencia = !oferta.audienciaAplicable || oferta.audienciaAplicable === producto.audiencia;
      return (oferta.categoriaAplicable || oferta.audienciaAplicable) != null && coincideCategoria && coincideAudiencia;
    });

    if (aplicables.length === 0) {
      return undefined;
    }

    return aplicables.reduce((mejor, actual) =>
      this.calcularMontoDescuento(producto.precio, actual) > this.calcularMontoDescuento(producto.precio, mejor)
        ? actual
        : mejor
    );
  }

  calcularPrecio(producto: Producto): PrecioConOferta {
    const oferta = this.ofertaVigenteParaProducto(producto);

    if (!oferta) {
      return { precioOriginal: producto.precio, precioFinal: producto.precio };
    }

    const descuento = this.calcularMontoDescuento(producto.precio, oferta);
    const precioFinal = Math.max(0, Math.round((producto.precio - descuento) * 100) / 100);
    const porcentajeDescuento = Math.round((descuento / producto.precio) * 100);

    return { precioOriginal: producto.precio, precioFinal, oferta, porcentajeDescuento };
  }

  private calcularMontoDescuento(precio: number, oferta: Oferta): number {
    return oferta.tipoDescuento === 'porcentaje' ? precio * (oferta.valorDescuento / 100) : oferta.valorDescuento;
  }

  private guardarOfertas(): void {
    localStorage.setItem(CLAVE_OFERTAS, JSON.stringify(this.ofertas));
  }

  private leerOfertasGuardadas(): Oferta[] {
    const guardadas = localStorage.getItem(CLAVE_OFERTAS);
    return guardadas ? (JSON.parse(guardadas) as Oferta[]) : [];
  }
}
