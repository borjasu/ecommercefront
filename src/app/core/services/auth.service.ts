import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { ToastService } from './toast.service';

const CLAVE_SESION = 'session_user';
const CLAVE_USUARIOS_REGISTRADOS = 'usuarios_registrados';
const CLAVE_OVERRIDES = 'usuarios_overrides';

// Diagnóstico (antes de este cambio): AuthService no tenía ningún mecanismo
// de expiración — `session_user` guardaba el Usuario tal cual y solo se
// borraba con logout() explícito. La sesión "se sentía" corta no por un
// timer sino porque no existía ninguno: cualquier otra causa de pérdida
// (recarga, guard mal configurado) se descartó al revisar authGuard/roleGuard
// y CartService, que sí persisten correctamente en localStorage. Se
// implementa aquí la duración de 1 hora pedida, con renovación por
// actividad: cada navegación dentro de la SPA con sesión activa reinicia el
// conteo (guardado como `expiraEn`, un timestamp absoluto, junto al usuario),
// así que en la práctica expira tras 1 hora SIN navegar, no 1 hora fija
// desde el login — evita cortar un checkout a medio llenar.
const DURACION_SESION_MS = 60 * 60 * 1000;
const AVISO_ANTES_DE_EXPIRAR_MS = 5 * 60 * 1000;
const INTERVALO_CHEQUEO_MS = 15 * 1000;

interface SesionAlmacenada {
  usuario: Usuario;
  expiraEn: number;
}

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
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly currentUser = signal<Usuario | null>(null);

  private expiraEn: number | null = null;
  private avisoMostrado = false;

  constructor() {
    this.restaurarSesion();

    // Renueva la sesión con cada navegación dentro de la SPA mientras haya
    // un usuario activo: es la señal de "actividad" más simple disponible
    // sin instrumentar clics/teclas por toda la app.
    this.router.events.subscribe(evento => {
      if (evento instanceof NavigationEnd && this.currentUser()) {
        this.renovarSesion();
      }
    });

    setInterval(() => this.verificarExpiracion(), INTERVALO_CHEQUEO_MS);
  }

  login(email: string, password: string): Observable<Usuario | null> {
    const usuario = this.todosLosUsuarios().find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null;

    if (usuario) {
      this.guardarSesion(usuario, Date.now() + DURACION_SESION_MS);
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

    this.guardarSesion(nuevoUsuario, Date.now() + DURACION_SESION_MS);

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
    this.expiraEn = null;
    this.avisoMostrado = false;
  }

  /** Extiende la sesión activa 1 hora más a partir de ahora. */
  renovarSesion(): void {
    const usuario = this.currentUser();
    if (!usuario) {
      return;
    }
    this.guardarSesion(usuario, Date.now() + DURACION_SESION_MS);
  }

  private verificarExpiracion(): void {
    if (!this.currentUser() || this.expiraEn == null) {
      return;
    }

    const restante = this.expiraEn - Date.now();

    if (restante <= 0) {
      this.logout();
      this.toastService.error('Tu sesión expiró por inactividad.');
      this.router.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
      return;
    }

    if (restante <= AVISO_ANTES_DE_EXPIRAR_MS && !this.avisoMostrado) {
      this.avisoMostrado = true;
      this.toastService.mostrar('Tu sesión expirará pronto. Sigue navegando para mantenerla activa.', 'info');
    }
  }

  private actualizarUsuario(id: string, cambios: Partial<Usuario>): Usuario {
    const overrides = this.leerOverrides();
    overrides[id] = { ...overrides[id], ...cambios };
    localStorage.setItem(CLAVE_OVERRIDES, JSON.stringify(overrides));

    const actualizado = this.todosLosUsuarios().find(u => u.id === id) as Usuario;

    if (this.currentUser()?.id === id) {
      // Conserva la expiración vigente: actualizar el perfil no cuenta como
      // la "actividad de navegación" que renueva la sesión.
      this.guardarSesion(actualizado, this.expiraEn ?? Date.now() + DURACION_SESION_MS);
    }

    return actualizado;
  }

  private guardarSesion(usuario: Usuario, expiraEn: number): void {
    this.expiraEn = expiraEn;
    this.avisoMostrado = false;
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ usuario, expiraEn } satisfies SesionAlmacenada));
    this.currentUser.set(usuario);
  }

  private restaurarSesion(): void {
    const crudo = localStorage.getItem(CLAVE_SESION);
    if (!crudo) {
      return;
    }

    try {
      const datos = JSON.parse(crudo);
      // Compatibilidad con el formato anterior (Usuario guardado directo, sin
      // expiración): se le da una expiración nueva de 1 hora en vez de cerrar
      // la sesión de golpe con esta actualización.
      const sesion: SesionAlmacenada =
        datos && typeof datos === 'object' && 'usuario' in datos && 'expiraEn' in datos
          ? (datos as SesionAlmacenada)
          : { usuario: datos as Usuario, expiraEn: Date.now() + DURACION_SESION_MS };

      if (!sesion.usuario || sesion.expiraEn <= Date.now()) {
        localStorage.removeItem(CLAVE_SESION);
        return;
      }

      this.expiraEn = sesion.expiraEn;
      this.currentUser.set(sesion.usuario);
    } catch {
      localStorage.removeItem(CLAVE_SESION);
    }
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
