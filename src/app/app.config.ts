import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { AuthService } from './core/services/auth.service';

// MERGE (app.config.ts no estaba en la lista de conflictos, pero quedó con
// imports y `providers` duplicados de una fusión anterior sin resolver — se
// arregló aparte). credentialsInterceptor es de origin/main (agrega
// withCredentials automáticamente a las peticiones hacia API_URL, útil
// aunque AuthService/ProductoService/etc. de HEAD también lo pasen a mano
// por request); el resto (orden de interceptores, inicializarSesion vía
// firstValueFrom) sigue la versión de HEAD, que es la que se usó para
// resolver auth.service.ts/auth-refresh.interceptor.ts.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Orden importa: credentialsInterceptor debe ir primero para que el
    // request de reintento que dispara authRefreshInterceptor ya lleve
    // withCredentials puesto.
    provideHttpClient(withInterceptors([credentialsInterceptor, authRefreshInterceptor])),
    // Verifica si ya hay una sesión válida (cookie httpOnly) ANTES de que el
    // router resuelva la primera navegación — así authGuard/roleGuard ven
    // currentUser() correctamente poblado incluso en un F5 sobre una ruta
    // protegida, en vez de una carrera contra una petición HTTP en curso.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).inicializarSesion()))
  ]
};
