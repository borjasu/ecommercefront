import { Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
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
      password: ['', [Validators.required, Validators.minLength(6)]],
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
      next: () => this.router.navigate(['/catalogo']),
      error: (error: Error) => (this.errorMensaje = error.message)
    });
  }
}
