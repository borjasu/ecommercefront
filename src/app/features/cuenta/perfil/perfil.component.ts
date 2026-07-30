import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
    selector: 'app-perfil',
    imports: [RouterLink, DatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './perfil.component.html'
})
export class PerfilComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly usuarioActual = this.authService.currentUser;

  async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Seguro que quieres cerrar sesión?',
      textoConfirmar: 'Cerrar sesión',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.authService.logout();
    this.toastService.exito('Sesión cerrada.');
    this.router.navigate(['/']);
  }
}
