import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ContactoService } from '../../core/services/contacto.service';

const MENSAJE_ERROR_DEFAULT = 'No pudimos enviar tu mensaje. Intenta de nuevo.';

@Component({
    selector: 'app-contacto',
    imports: [ReactiveFormsModule, BreadcrumbComponent],
    templateUrl: './contacto.component.html',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactoService = inject(ContactoService);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, { label: 'Contacto' }];

  readonly enviado = signal(false);
  readonly enviando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    mensaje: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  onSubmit(): void {
    this.errorMensaje.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, correo, mensaje } = this.form.getRawValue();
    this.enviando.set(true);

    this.contactoService.enviar({ nombre: nombre!, email: correo!, mensaje: mensaje! }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorMensaje.set(
          error.status === 429
            ? 'Enviaste demasiados mensajes. Intenta de nuevo en unos minutos.'
            : (error.error?.message ?? MENSAJE_ERROR_DEFAULT)
        );
      }
    });
  }
}
