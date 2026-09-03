import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsIgualesValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmarPassword = control.get('confirmarPassword')?.value;
  return password === confirmarPassword ? null : { passwordsNoCoinciden: true };
}

// Misma regla que el backend (RegistroDto): mínimo 8 caracteres, al menos una
// mayúscula y un dígito. Validarlo aquí también evita un viaje al servidor
// solo para enterarse de que la contraseña no cumple la política.
const REGEX_PASSWORD_SEGURA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
    selector: 'app-registro',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './registro.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './registro.component.css'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMensaje = '';

  readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(REGEX_PASSWORD_SEGURA)]],
      confirmarPassword: ['', [Validators.required]]
    },
    { validators: passwordsIgualesValidator }
  );

  onSubmit(): void {
    this.errorMensaje = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, email, password } = this.form.getRawValue();

    this.authService.registro(nombre!, email!, password!).subscribe({
      next: () => this.router.navigate(['/']),
      error: (error: Error) => (this.errorMensaje = error.message)
    });
  }
}
