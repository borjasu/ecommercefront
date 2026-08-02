import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface DatosMensajeContacto {
  nombre: string;
  email: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactoService {
  private readonly http = inject(HttpClient);

  enviar(datos: DatosMensajeContacto): Observable<void> {
    return this.http.post<void>(`${API_URL}/contacto`, datos);
  }
}
