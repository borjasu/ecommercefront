import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Orden importa: credentialsInterceptor debe ir primero para que el
    // request de reintento que dispara authRefreshInterceptor ya lleve
    // withCredentials puesto.
    provideHttpClient(withInterceptors([credentialsInterceptor, authRefreshInterceptor])),
    // Antes de que arranquen los guards/rutas, pregunta al backend si la
    // cookie de sesión sigue vigente — sin esto, un F5 en una ruta protegida
    // siempre mandaría al usuario a /login aunque su sesión siga activa.
    provideAppInitializer(() => inject(AuthService).cargarSesionInicial())
  ]
};
