import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function passwordsNuevasIgualesValidator(control: AbstractControl): ValidationErrors | null {
  const nueva = control.get('passwordNueva')?.value;
  const confirmar = control.get('confirmarPasswordNueva')?.value;
  return nueva === confirmar ? null : { passwordsNoCoinciden: true };
}

@Component({
    selector: 'app-datos-personales',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './datos-personales.component.html'
})
export class DatosPersonalesComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly usuarioActual = this.authService.currentUser;

  readonly datosGuardados = signal(false);
  readonly passwordMensaje = signal<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  readonly datosForm = this.fb.group({
    nombre: [this.usuarioActual()?.nombre ?? '', [Validators.required]],
    telefono: [this.usuarioActual()?.telefono ?? '']
  });

  readonly passwordForm = this.fb.group(
    {
      passwordActual: ['', [Validators.required]],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPasswordNueva: ['', [Validators.required]]
    },
    { validators: passwordsNuevasIgualesValidator }
  );

  guardarDatos(): void {
    this.datosGuardados.set(false);

    if (this.datosForm.invalid) {
      this.datosForm.markAllAsTouched();
      return;
    }

    const usuario = this.usuarioActual();
    if (!usuario) {
      return;
    }

    const { nombre, telefono } = this.datosForm.getRawValue();
    this.authService.actualizarPerfil(usuario.id, { nombre: nombre!, telefono: telefono ?? '' }).subscribe(() => {
      this.datosGuardados.set(true);
      this.toastService.exito('Tus datos se actualizaron correctamente.');
      setTimeout(() => this.datosGuardados.set(false), 2500);
    });
  }

  cambiarPassword(): void {
    this.passwordMensaje.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const usuario = this.usuarioActual();
    if (!usuario) {
      return;
    }

    const { passwordActual, passwordNueva } = this.passwordForm.getRawValue();

    this.authService.cambiarPassword(usuario.id, passwordActual!, passwordNueva!).subscribe(resultado => {
      if (resultado.exito) {
        this.passwordMensaje.set({ tipo: 'exito', texto: 'Tu contraseña se actualizó correctamente.' });
        this.toastService.exito('Tu contraseña se actualizó correctamente.');
        this.passwordForm.reset();
      } else {
        this.passwordMensaje.set({ tipo: 'error', texto: resultado.error ?? 'No se pudo cambiar la contraseña.' });
      }
    });
  }
}
