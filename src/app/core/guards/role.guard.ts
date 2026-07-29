import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Solo existe un vendedor en el sistema: este guard protege /vendedor/*.
// Si no hay sesión, auth.guard ya redirigió a /login antes de llegar aquí;
// si hay sesión pero el rol no es 'vendedor', se envía a inicio (no a login).
export const roleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const usuario = authService.currentUser();

  if (!usuario) {
    return router.createUrlTree(['/login']);
  }

  if (usuario.rol !== 'vendedor') {
    return router.createUrlTree(['/']);
  }

  return true;
};
