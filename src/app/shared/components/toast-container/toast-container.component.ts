import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './toast-container.component.html'
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
