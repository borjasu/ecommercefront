import { Injectable } from '@angular/core';
import { Talla } from '../models/producto.model';

// Debe coincidir exactamente con el enum `talla_enum` de Postgres en el backend
// (src/entities/enums.ts) — el backend no soporta tallas personalizadas por
// vendedor todavía, así que por ahora la lista es fija en ambos lados.
const TALLAS_BASE: Talla[] = ['S', 'M', 'L', 'XL'];

@Injectable({
  providedIn: 'root'
})
export class TallasService {
  readonly listado = () => TALLAS_BASE;
}
