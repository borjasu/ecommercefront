import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, Rol } from '../models/usuario.model';
import { ToastService } from './toast.service';
import { OMITIR_REDIRECCION_AL_EXPIRAR } from '../interceptors/auth-refresh.interceptor';

// AuthService habla con el backend real (ecommerceback): la sesión vive en
// cookies HttpOnly (access_token de 15 min + refresh_token de 7 días, ver
// AuthModule/cookie.util.ts del backend) que el navegador maneja solo — por
// eso TODAS las llamadas de aquí llevan `withCredentials: true` y ya no hay
// nada que guardar a mano en localStorage. La renovación del access token
// vencido es transparente: la maneja authRefreshInterceptor (ver
// core/interceptors/auth-refresh.interceptor.ts) reintentando una vez tras
// un 401; este servicio solo expone refrescarSesion()/cerrarSesionLocal()
// para que ese interceptor los use.

// Forma de la respuesta de /auth/login, /auth/registro y /auth/refresh
// (AuthController del backend): datos mínimos, sin telefono/fechaRegistro.
interface RespuestaAuthBasica {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

// Forma de GET/PATCH /usuarios/perfil (PerfilUsuario del backend): el perfil
// completo, que es lo que de verdad necesita la UI (ver perfil.component.html,
// que muestra telefono y fechaRegistro).
interface RespuestaPerfil extends RespuestaAuthBasica {
  telefono: string | null;
  fechaRegistro: string;
}

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
  private readonly toastService = inject(ToastService);

  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly perfilUrl = `${environment.apiUrl}/usuarios/perfil`;

  readonly currentUser = signal<Usuario | null>(null);

  // Comparte un único POST /auth/refresh entre todas las peticiones que
  // reciban un 401 al mismo tiempo (ej. varias cards del catálogo pidiendo
  // datos de vendedor a la vez) — evita una estampida de refrescos
  // simultáneos que rotarían el refresh token varias veces innecesariamente.
  private refrescoEnCurso$: Observable<void> | null = null;

  /**
   * Verificación de sesión al cargar la app: la llama provideAppInitializer
   * en app.config.ts ANTES de que el router resuelva la primera navegación,
   * así los guards (authGuard/roleGuard) ya ven currentUser() poblado si la
   * cookie de sesión seguía vigente (F5, nueva pestaña, etc.). Un 401 aquí
   * solo significa "no hay sesión" — nunca es un error que deba mostrarse.
   */
  inicializarSesion(): Observable<void> {
    const contexto = new HttpContext().set(OMITIR_REDIRECCION_AL_EXPIRAR, true);

    return this.http.get<RespuestaPerfil>(this.perfilUrl, { withCredentials: true, context: contexto }).pipe(
      tap(perfil => this.currentUser.set(this.aUsuario(perfil))),
      map(() => undefined),
      catchError(() => {
        this.currentUser.set(null);
        return of(undefined);
      })
    );
  }

  login(email: string, password: string): Observable<Usuario | null> {
    return this.iniciarSesionConCredenciales(email, password).pipe(
      catchError((error: unknown) => {
        // 401 = credenciales inválidas: es el flujo normal de un login
        // fallido, lo maneja LoginComponent mostrando su propio mensaje.
        // Cualquier otro error (429 por throttling, backend caído, etc.) sí
        // es una sorpresa y vale la pena avisarlo con un toast.
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          this.toastService.error(this.extraerMensaje(error));
        }
        return of(null);
      })
    );
  }

  registro(nombre: string, email: string, password: string): Observable<Usuario> {
    return this.http
      .post<RespuestaAuthBasica>(`${this.authUrl}/registro`, { nombre, email, password }, { withCredentials: true })
      .pipe(
        // El backend fuerza rol 'comprador' en /auth/registro sin importar lo
        // que se le mande (ver RegistroDto/AuthService.registro del backend) —
        // por eso este formulario nunca envía ni deja elegir rol.
        // /auth/registro solo crea la cuenta, no deja cookies de sesión: se
        // encadena un login con las mismas credenciales para que, igual que
        // antes con el mock, quedar registrado equivalga a quedar dentro.
        switchMap(() => this.iniciarSesionConCredenciales(email, password)),
        catchError((error: unknown) => throwError(() => new Error(this.extraerMensaje(error))))
      );
  }

  actualizarPerfil(id: string, cambios: { nombre?: string; telefono?: string }): Observable<Usuario> {
    // El backend nunca recibe id: PATCH /usuarios/perfil siempre opera sobre
    // el usuario del JWT de la cookie (ver UsersController, que a propósito
    // no acepta :id para eliminar cualquier superficie de IDOR). Se conserva
    // el parámetro solo para no romper la firma que ya consume
    // DatosPersonalesComponent.
    void id;

    return this.http.patch<RespuestaPerfil>(this.perfilUrl, cambios, { withCredentials: true }).pipe(
      map(perfil => this.aUsuario(perfil)),
      tap(usuario => this.currentUser.set(usuario))
    );
  }

  cambiarPassword(id: string, passwordActual: string, passwordNueva: string): Observable<ResultadoCambioPassword> {
    void id;

    return this.http
      .patch<void>(`${this.authUrl}/cambiar-password`, { passwordActual, passwordNueva }, { withCredentials: true })
      .pipe(
        map(() => {
          // El backend rota refreshTokenVersion y limpia las cookies al
          // cambiar la contraseña (obliga a reautenticarse en este mismo
          // dispositivo) — se refleja localmente cerrando la sesión y
          // mandando a /login con el mismo aviso que un cierre por expiración.
          this.cerrarSesionLocal();
          this.router.navigate(['/login'], { queryParams: { motivo: 'password-actualizada' } });
          return { exito: true } satisfies ResultadoCambioPassword;
        }),
        catchError((error: unknown) => of({ exito: false, error: this.extraerMensaje(error) }))
      );
  }

  /** Cierra sesión en el backend (limpia las cookies del lado servidor) y localmente. */
  logout(): void {
    // Fire-and-forget: el estado local se limpia de inmediato sin esperar la
    // respuesta (misma UX síncrona que antes), y si la petición falla (red
    // caída, etc.) da igual — las cookies igual expiran solas y no hay nada
    // más que el usuario pueda hacer al respecto desde aquí.
    this.http.post<void>(`${this.authUrl}/logout`, {}, { withCredentials: true }).subscribe({ error: () => {} });
    this.cerrarSesionLocal();
  }

  /** Limpia solo el estado local (sin llamar al backend) — usado cuando ya se sabe que la sesión del servidor terminó. */
  cerrarSesionLocal(): void {
    this.currentUser.set(null);
  }

  /**
   * POST /auth/refresh usando la cookie httpOnly refresh_token; la llama
   * authRefreshInterceptor tras un 401. Multicasta la llamada en curso para
   * que 401s simultáneos no disparen refrescos por duplicado.
   */
  refrescarSesion(): Observable<void> {
    if (!this.refrescoEnCurso$) {
      // No hace falta releer el perfil completo aquí: es solo renovación de
      // token, los datos del usuario en currentUser() no cambiaron.
      // shareReplay multicasta esta única llamada HTTP a todos los 401
      // simultáneos que la pidan mientras está en curso; finalize limpia la
      // referencia al terminar (éxito o error) para que la siguiente vez que
      // el access token expire se dispare un refresh nuevo, no el mismo.
      this.refrescoEnCurso$ = this.http
        .post<RespuestaAuthBasica>(`${this.authUrl}/refresh`, {}, { withCredentials: true })
        .pipe(
          map(() => undefined),
          finalize(() => {
            this.refrescoEnCurso$ = null;
          }),
          shareReplay(1)
        );
    }
    return this.refrescoEnCurso$;
  }

  private iniciarSesionConCredenciales(email: string, password: string): Observable<Usuario> {
    return this.http
      .post<RespuestaAuthBasica>(`${this.authUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(
        switchMap(() =>
          this.http.get<RespuestaPerfil>(this.perfilUrl, { withCredentials: true })
        ),
        map(perfil => this.aUsuario(perfil)),
        tap(usuario => this.currentUser.set(usuario))
      );
  }

  private aUsuario(perfil: RespuestaPerfil): Usuario {
    return {
      id: perfil.id,
      nombre: perfil.nombre,
      email: perfil.email,
      rol: perfil.rol as Rol,
      telefono: perfil.telefono ?? undefined,
      fechaRegistro: perfil.fechaRegistro
    };
  }

  private extraerMensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const mensaje = (error.error as { message?: string | string[] } | null)?.message;
      if (Array.isArray(mensaje)) {
        return mensaje.join(' ');
      }
      if (typeof mensaje === 'string') {
        return mensaje;
      }
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
