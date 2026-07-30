import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Usuario } from '../models/usuario.model';

const CLAVE_SESION = 'session_user';
const CLAVE_USUARIOS_REGISTRADOS = 'usuarios_registrados';
const CLAVE_OVERRIDES = 'usuarios_overrides';

// Único vendedor del sistema: no es un marketplace, así que esta cuenta
// viene precargada y nunca se crea desde el formulario de registro público.
const USUARIOS_SEED: Usuario[] = [
  {
    id: 'seed-vendedor',
    nombre: 'Frank',
    email: 'vendedor@frankjeans.com',
    password: 'vendedor123',
    rol: 'vendedor',
    fechaRegistro: '2024-01-15T00:00:00.000Z'
  }
];

export interface ResultadoCambioPassword {
  exito: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser = signal<Usuario | null>(this.leerSesionGuardada());

  login(email: string, password: string): Observable<Usuario | null> {
    const usuario = this.todosLosUsuarios().find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null;

    if (usuario) {
      this.guardarSesion(usuario);
    }

    return of(usuario);
  }

  registro(nombre: string, email: string, password: string): Observable<Usuario> {
    const yaRegistrado = this.todosLosUsuarios().some(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (yaRegistrado) {
      return throwError(() => new Error('Ya existe una cuenta con ese correo electrónico.'));
    }

    const nuevoUsuario: Usuario = {
      id: crypto.randomUUID(),
      nombre,
      email,
      password,
      rol: 'comprador',
      fechaRegistro: new Date().toISOString()
    };

    const registrados = this.leerUsuariosRegistrados();
    registrados.push(nuevoUsuario);
    localStorage.setItem(CLAVE_USUARIOS_REGISTRADOS, JSON.stringify(registrados));

    this.guardarSesion(nuevoUsuario);

    return of(nuevoUsuario);
  }

  actualizarPerfil(id: string, cambios: { nombre?: string; telefono?: string }): Observable<Usuario> {
    return of(this.actualizarUsuario(id, cambios));
  }

  cambiarPassword(id: string, passwordActual: string, passwordNueva: string): Observable<ResultadoCambioPassword> {
    const usuario = this.todosLosUsuarios().find(u => u.id === id);

    if (!usuario || usuario.password !== passwordActual) {
      return of({ exito: false, error: 'La contraseña actual no es correcta.' });
    }

    this.actualizarUsuario(id, { password: passwordNueva });
    return of({ exito: true });
  }

  logout(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.currentUser.set(null);
  }

  private actualizarUsuario(id: string, cambios: Partial<Usuario>): Usuario {
    const overrides = this.leerOverrides();
    overrides[id] = { ...overrides[id], ...cambios };
    localStorage.setItem(CLAVE_OVERRIDES, JSON.stringify(overrides));

    const actualizado = this.todosLosUsuarios().find(u => u.id === id) as Usuario;

    if (this.currentUser()?.id === id) {
      this.guardarSesion(actualizado);
    }

    return actualizado;
  }

  private guardarSesion(usuario: Usuario): void {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    this.currentUser.set(usuario);
  }

  private leerSesionGuardada(): Usuario | null {
    const guardado = localStorage.getItem(CLAVE_SESION);
    return guardado ? (JSON.parse(guardado) as Usuario) : null;
  }

  private leerUsuariosRegistrados(): Usuario[] {
    const guardados = localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS);
    return guardados ? (JSON.parse(guardados) as Usuario[]) : [];
  }

  private leerOverrides(): Record<string, Partial<Usuario>> {
    const guardados = localStorage.getItem(CLAVE_OVERRIDES);
    return guardados ? (JSON.parse(guardados) as Record<string, Partial<Usuario>>) : {};
  }

  private todosLosUsuarios(): Usuario[] {
    const overrides = this.leerOverrides();
    return [...USUARIOS_SEED, ...this.leerUsuariosRegistrados()].map(usuario => ({
      ...usuario,
      fechaRegistro: usuario.fechaRegistro ?? new Date(0).toISOString(),
      ...overrides[usuario.id]
    }));
  }
}
