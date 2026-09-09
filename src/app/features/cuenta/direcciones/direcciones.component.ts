import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DireccionesService } from '../../../core/services/direcciones.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Direccion } from '../../../core/models/direccion.model';
import { soloDigitos } from '../../../shared/utils/texto.util';

const LARGO_TELEFONO = 10;

@Component({
    selector: 'app-direcciones',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './direcciones.component.html'
})
export class DireccionesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  readonly direccionesService = inject(DireccionesService);

  readonly mostrarFormulario = signal(false);
  readonly direccionEditando = signal<Direccion | null>(null);

  readonly direccionForm = this.fb.group({
    alias: ['', [Validators.required]],
    nombreCompleto: ['', [Validators.required]],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    predeterminada: [false]
  });

  onTelefonoInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.direccionForm.patchValue({ telefono: soloDigitos(valor, LARGO_TELEFONO) });
  }

  abrirFormularioNuevo(): void {
    this.direccionEditando.set(null);
    this.direccionForm.reset({
      alias: '',
      nombreCompleto: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      telefono: '',
      predeterminada: this.direccionesService.listado().length === 0
    });
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(direccion: Direccion): void {
    this.direccionEditando.set(direccion);
    this.direccionForm.reset(direccion);
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      return;
    }

    const valores = this.direccionForm.getRawValue();
    const datos = {
      alias: valores.alias!,
      nombreCompleto: valores.nombreCompleto!,
      direccion: valores.direccion!,
      ciudad: valores.ciudad!,
      codigoPostal: valores.codigoPostal!,
      telefono: valores.telefono!,
      predeterminada: !!valores.predeterminada
    };

    const edicion = this.direccionEditando();
    if (edicion) {
      this.direccionesService.actualizar(edicion.id, datos);
      this.toastService.exito('Dirección actualizada.');
    } else {
      this.direccionesService.agregar(datos);
      this.toastService.exito('Dirección agregada.');
    }

    this.cerrarFormulario();
  }

  async eliminar(direccion: Direccion): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar dirección',
      mensaje: `¿Eliminar la dirección "${direccion.alias}"?`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.direccionesService.eliminar(direccion.id);
    this.toastService.exito('Dirección eliminada.');
  }

  marcarPredeterminada(direccion: Direccion): void {
    this.direccionesService.marcarPredeterminada(direccion.id);
    this.toastService.exito(`"${direccion.alias}" ahora es tu dirección predeterminada.`);
  }
}
