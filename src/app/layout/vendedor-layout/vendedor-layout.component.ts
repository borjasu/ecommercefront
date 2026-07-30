import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
    selector: 'app-vendedor-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent, ConfirmModalComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './vendedor-layout.component.html'
})
export class VendedorLayoutComponent {
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
    this.router.navigate(['/login']);
  }
}
