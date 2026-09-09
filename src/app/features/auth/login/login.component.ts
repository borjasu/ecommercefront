import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  errorMensaje = '';

  // AuthService/authRefreshInterceptor redirigen aquí con ?motivo=... cuando
  // cierran la sesión por una causa que no es un login fallido normal: la
  // sesión de 7 días terminó de verdad (el refresh automático también
  // falló) o se acaba de cambiar la contraseña (el backend invalida la
  // sesión actual al hacerlo, ver AuthService.cambiarPassword).
  private readonly motivo = this.route.snapshot.queryParamMap.get('motivo');

  readonly avisoSesion =
    this.motivo === 'sesion-expirada'
      ? 'Tu sesión expiró. Inicia sesión de nuevo.'
      : this.motivo === 'password-actualizada'
        ? 'Tu contraseña se actualizó. Inicia sesión de nuevo.'
        : null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onSubmit(): void {
    this.errorMensaje = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.authService.login(email!, password!).subscribe(usuario => {
      if (!usuario) {
        this.errorMensaje = 'Correo o contraseña incorrectos.';
        return;
      }

      if (usuario.rol === 'vendedor') {
        this.router.navigate(['/vendedor/dashboard']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
