import { Component, ElementRef, effect, inject, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './confirm-modal.component.html'
})
export class ConfirmModalComponent {
  readonly confirmService = inject(ConfirmService);

  readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => {
      if (this.confirmService.solicitud()) {
        setTimeout(() => this.panel()?.nativeElement.focus());
      }
    });
  }

  confirmar(): void {
    this.confirmService.responder(true);
  }

  cancelar(): void {
    this.confirmService.responder(false);
  }

  onKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.cancelar();
    }
  }
}
