import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-contacto',
    imports: [ReactiveFormsModule, BreadcrumbComponent],
    templateUrl: './contacto.component.html',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, { label: 'Contacto' }];

  readonly enviado = signal(false);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    mensaje: ['', [Validators.required]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Provisional: aún no hay backend de contacto conectado.
    this.enviado.set(true);
    this.form.reset();
  }
}
