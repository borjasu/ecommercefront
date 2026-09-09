import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { Direccion } from '../models/direccion.model';

@Injectable({
  providedIn: 'root'
})
export class DireccionesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly direcciones = signal<Direccion[]>([]);

  readonly listado = this.direcciones.asReadonly();

  constructor() {
    // Se recarga cada vez que cambia la sesión (login/logout) — direcciones
    // es información del usuario autenticado, no algo que sobreviva sin sesión.
    effect(() => {
      const usuario = this.authService.currentUser();
      if (usuario) {
        this.cargar();
      } else {
        this.direcciones.set([]);
      }
    });
  }

  agregar(datos: Omit<Direccion, 'id'>): void {
    this.http.post<Direccion>(`${API_URL}/direcciones`, datos).subscribe(() => this.cargar());
  }

  /** Como agregar(), pero devuelve la dirección creada — la usa el checkout para seleccionarla de inmediato. */
  crearYObtener(datos: Omit<Direccion, 'id'>) {
    return this.http.post<Direccion>(`${API_URL}/direcciones`, datos).pipe(tap(() => this.cargar()));
  }

  actualizar(id: string, cambios: Partial<Omit<Direccion, 'id'>>): void {
    this.http.patch<Direccion>(`${API_URL}/direcciones/${id}`, cambios).subscribe(() => this.cargar());
  }

  eliminar(id: string): void {
    this.http.delete<void>(`${API_URL}/direcciones/${id}`).subscribe(() => this.cargar());
  }

  marcarPredeterminada(id: string): void {
    this.actualizar(id, { predeterminada: true });
  }

  private cargar(): void {
    this.http.get<Direccion[]>(`${API_URL}/direcciones`).subscribe(direcciones => this.direcciones.set(direcciones));
  }
}
