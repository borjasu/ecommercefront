import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Usuario } from '../models/usuario.model';

export interface ResultadoCambioPassword {
  exito: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<Usuario | null>(null);

  /**
   * Se llama una sola vez al arrancar la app (ver app.config.ts,
   * provideAppInitializer) — como la sesión ahora vive en una cookie HttpOnly
   * que Angular no puede leer, la única forma de saber si hay sesión activa
   * es preguntarle al backend. Nunca debe lanzar: "no hay sesión" (401) es un
   * resultado normal, no un error.
   */
  cargarSesionInicial(): Observable<Usuario | null> {
    return this.http.get<Usuario>(`${API_URL}/usuarios/perfil`).pipe(
      tap(usuario => this.currentUser.set(usuario)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  login(email: string, password: string): Observable<Usuario | null> {
    return this.http.post<Usuario>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap(usuario => this.currentUser.set(usuario)),
      catchError(() => of(null))
    );
  }

  registro(nombre: string, email: string, password: string): Observable<Usuario> {
    // El backend solo crea la cuenta (no deja sesión iniciada); se encadena un
    // login para conservar el comportamiento previo: registrarse deja logueado.
    return this.http.post(`${API_URL}/auth/registro`, { nombre, email, password }).pipe(
      switchMap(() => this.http.post<Usuario>(`${API_URL}/auth/login`, { email, password })),
      tap(usuario => this.currentUser.set(usuario)),
      catchError((error: HttpErrorResponse) => {
        throw new Error(error.error?.message ?? 'No pudimos crear tu cuenta. Intenta de nuevo.');
      })
    );
  }

  actualizarPerfil(_id: string, cambios: { nombre?: string; telefono?: string }): Observable<Usuario> {
    // El parámetro id se conserva por compatibilidad con los componentes que
    // ya lo mandaban — el backend siempre opera sobre el usuario de la cookie,
    // nunca sobre un id que venga del cliente.
    return this.http
      .patch<Usuario>(`${API_URL}/usuarios/perfil`, cambios)
      .pipe(tap(usuario => this.currentUser.set(usuario)));
  }

  cambiarPassword(_id: string, passwordActual: string, passwordNueva: string): Observable<ResultadoCambioPassword> {
    return this.http.patch(`${API_URL}/auth/cambiar-password`, { passwordActual, passwordNueva }).pipe(
      tap(() => {
        // El backend cierra la sesión actual al cambiar la contraseña (limpia
        // las cookies), así que el frontend debe reflejar eso de inmediato.
        this.currentUser.set(null);
      }),
      map(() => ({ exito: true }) as ResultadoCambioPassword),
      catchError((error: HttpErrorResponse) =>
        of({ exito: false, error: error.error?.message ?? 'No se pudo cambiar la contraseña.' })
      )
    );
  }

  logout(): void {
    this.http.post(`${API_URL}/auth/logout`, {}).subscribe({
      next: () => this.finalizarSesionLocal(),
      error: () => this.finalizarSesionLocal()
    });
  }

  private finalizarSesionLocal(): void {
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }
}
