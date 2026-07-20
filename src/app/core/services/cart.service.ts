import { Injectable, signal } from '@angular/core';

// Contador visual para el header. El carrito real (items, totales, persistencia)
// se implementa en la Fase 6; por ahora solo expone el conteo de artículos.
@Injectable({
  providedIn: 'root'
})
export class CartService {
  readonly cantidadItems = signal(0);
}
