import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ColoniaCp {
  nombre: string;
  tipoAsentamiento: string | null;
}

export interface CodigoPostalInfo {
  estado: string;
  municipio: string;
  colonias: ColoniaCp[];
}

// Catálogo público SEPOMEX (GET /codigos-postales/:cp, sin auth) — usado en
// el checkout para autocompletar estado/municipio y ofrecer las colonias
// reales de un código postal, sin depender de un proveedor externo de pago
// (se descartó un mapa interactivo tipo Mapbox por su costo recurrente).
@Injectable({
  providedIn: 'root'
})
export class CodigosPostalesService {
  private readonly http = inject(HttpClient);

  buscar(codigoPostal: string): Observable<CodigoPostalInfo> {
    return this.http.get<CodigoPostalInfo>(`${environment.apiUrl}/codigos-postales/${codigoPostal}`);
  }
}
