import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Usuario } from '../models/usuario.model';

const CLAVE_SESION = 'session_user';
const CLAVE_USUARIOS_REGISTRADOS = 'usuarios_registrados';

// Único vendedor del sistema: no es un marketplace, así que esta cuenta
// viene precargada y nunca se crea desde el formulario de registro público.
const USUARIOS_SEED: Usuario[] = [
  {
    id: 'seed-vendedor',
    nombre: 'Frank',
    email: 'vendedor@frankjeans.com',
    password: 'vendedor123',
    rol: 'vendedor'
  }
];

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
      rol: 'comprador'
    };

    const registrados = this.leerUsuariosRegistrados();
    registrados.push(nuevoUsuario);
    localStorage.setItem(CLAVE_USUARIOS_REGISTRADOS, JSON.stringify(registrados));

    this.guardarSesion(nuevoUsuario);

    return of(nuevoUsuario);
  }

  logout(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.currentUser.set(null);
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

  private todosLosUsuarios(): Usuario[] {
    return [...USUARIOS_SEED, ...this.leerUsuariosRegistrados()];
  }
}
