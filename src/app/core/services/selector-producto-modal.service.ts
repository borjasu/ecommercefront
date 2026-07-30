import { Injectable, signal } from '@angular/core';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class SelectorProductoModalService {
  private readonly _productoActivo = signal<Producto | null>(null);

  readonly productoActivo = this._productoActivo.asReadonly();

  abrir(producto: Producto): void {
    this._productoActivo.set(producto);
  }

  cerrar(): void {
    this._productoActivo.set(null);
  }
}
