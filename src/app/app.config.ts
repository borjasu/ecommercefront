import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    // Antes de que arranquen los guards/rutas, pregunta al backend si la
    // cookie de sesión sigue vigente — sin esto, un F5 en una ruta protegida
    // siempre mandaría al usuario a /login aunque su sesión siga activa.
    provideAppInitializer(() => inject(AuthService).cargarSesionInicial())
  ]
};
