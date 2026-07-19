import { Injectable, signal } from '@angular/core';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly usuarioActualSignal = signal<Usuario | null>(null);
  readonly usuarioActual = this.usuarioActualSignal.asReadonly();

  constructor() { }

  estaAutenticado(): boolean {
    return this.usuarioActualSignal() !== null;
  }

  // TODO: conectar con el endpoint real de autenticación del backend.
  login(email: string, password: string): void {
    console.warn('AuthService.login: pendiente de integrar con el backend', { email, password });
  }

  registro(usuario: Omit<Usuario, 'id'>): void {
    console.warn('AuthService.registro: pendiente de integrar con el backend', usuario);
  }

  logout(): void {
    this.usuarioActualSignal.set(null);
  }
}
