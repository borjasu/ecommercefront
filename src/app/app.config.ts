import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // AuthService (login/registro/perfil/refresh) y RecoloreoService hablan
    // con el backend real. El resto del CRUD de productos sigue siendo mock
    // (ProductoService, ColoresService, etc. no usan HttpClient).
    // authRefreshInterceptor reintenta una vez, en silencio, cualquier 401
    // renovando el access token vencido antes de darlo por sesión terminada.
    provideHttpClient(withInterceptors([authRefreshInterceptor])),
    // Verifica si ya hay una sesión válida (cookie httpOnly) ANTES de que el
    // router resuelva la primera navegación — así authGuard/roleGuard ven
    // currentUser() correctamente poblado incluso en un F5 sobre una ruta
    // protegida, en vez de una carrera contra una petición HTTP en curso.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).inicializarSesion()))
  ]
};
