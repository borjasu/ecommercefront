import { Component, ElementRef, effect, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
    selector: 'app-vendedor-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, ToastContainerComponent, ConfirmModalComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './vendedor-layout.component.html'
})
export class VendedorLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly usuarioActual = this.authService.currentUser;
  readonly menuAbierto = signal(false);

  readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

  constructor() {
    effect(() => {
      if (this.menuAbierto()) {
        setTimeout(() => this.drawer()?.nativeElement.focus());
      }
    });
  }

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  onDrawerKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.cerrarMenu();
    }
  }

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

    this.cerrarMenu();
    this.authService.logout();
    this.toastService.exito('Sesión cerrada.');
    this.router.navigate(['/login']);
  }
}
