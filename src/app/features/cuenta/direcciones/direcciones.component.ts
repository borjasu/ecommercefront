import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DireccionesService } from '../../../core/services/direcciones.service';
import { CodigosPostalesService, ColoniaCp } from '../../../core/services/codigos-postales.service';
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
  private readonly codigosPostalesService = inject(CodigosPostalesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly direccionesService = inject(DireccionesService);

  readonly mostrarFormulario = signal(false);
  readonly direccionEditando = signal<Direccion | null>(null);

  // Estado de la resolución del código postal contra el catálogo SEPOMEX
  // (GET /codigos-postales/:cp) — sin esto no hay forma de distinguir "CP
  // todavía no válido", "el catálogo lo encontró" (estado/municipio se
  // bloquean, colonia es un selector) y "hueco de cobertura" (los tres se
  // vuelven editables a mano).
  readonly resolviendoCp = signal(false);
  readonly cpResuelto = signal(false);
  readonly cpSinCobertura = signal(false);
  readonly cpError = signal<string | null>(null);
  readonly colonias = signal<ColoniaCp[]>([]);

  readonly direccionForm = this.fb.group({
    alias: ['', [Validators.required]],
    nombreCompleto: ['', [Validators.required]],
    calle: ['', [Validators.required]],
    numeroExterior: ['', [Validators.required]],
    numeroInterior: [''],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    colonia: ['', [Validators.required]],
    municipio: ['', [Validators.required]],
    estado: ['', [Validators.required]],
    referencias: [''],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    predeterminada: [false]
  });

  constructor() {
    this.observarCodigoPostal();
  }

  onTelefonoInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.direccionForm.patchValue({ telefono: soloDigitos(valor, LARGO_TELEFONO) });
  }

  abrirFormularioNuevo(): void {
    this.direccionEditando.set(null);
    this.limpiarResolucionCp();
    this.direccionForm.reset({
      alias: '',
      nombreCompleto: '',
      calle: '',
      numeroExterior: '',
      numeroInterior: '',
      codigoPostal: '',
      colonia: '',
      municipio: '',
      estado: '',
      referencias: '',
      telefono: '',
      predeterminada: this.direccionesService.listado().length === 0
    });
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(direccion: Direccion): void {
    this.direccionEditando.set(direccion);
    // reset() ya dispara valueChanges de codigoPostal (ver
    // observarCodigoPostal), así que la resolución SEPOMEX corre igual que si
    // se acabara de teclear — si el catálogo cubre este CP, la colonia
    // guardada queda seleccionada dentro de la lista real de colonias en vez
    // de mostrarse como una opción suelta inventada.
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
      calle: valores.calle!,
      numeroExterior: valores.numeroExterior!,
      numeroInterior: valores.numeroInterior || null,
      colonia: valores.colonia!,
      municipio: valores.municipio!,
      estado: valores.estado!,
      codigoPostal: valores.codigoPostal!,
      referencias: valores.referencias || null,
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

  // Debounce de 400ms tras dejar de escribir el CP (cubre igual el caso de
  // perder el foco, que solo dispararía esto un poco antes) — resuelve
  // estado/municipio/colonia contra GET /codigos-postales/:cp.
  private observarCodigoPostal(): void {
    this.direccionForm.controls.codigoPostal.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(valor => {
          if (!/^\d{5}$/.test(valor ?? '')) {
            this.limpiarResolucionCp();
            return EMPTY;
          }

          this.resolviendoCp.set(true);
          this.cpError.set(null);

          return this.codigosPostalesService.buscar(valor!).pipe(
            catchError((error: HttpErrorResponse) => {
              this.resolviendoCp.set(false);
              this.cpResuelto.set(false);
              this.cpSinCobertura.set(true);
              this.colonias.set([]);
              this.cpError.set(
                error.status === 404
                  ? 'No encontramos ese código postal, verifícalo. Puedes completar estado, municipio y colonia manualmente.'
                  : 'No pudimos verificar el código postal. Puedes completar estado, municipio y colonia manualmente.'
              );
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        const coloniaActual = this.direccionForm.controls.colonia.value;
        const coloniaSigueValida = respuesta.colonias.some(c => c.nombre === coloniaActual);

        this.resolviendoCp.set(false);
        this.cpResuelto.set(true);
        this.cpSinCobertura.set(false);
        this.colonias.set(respuesta.colonias);
        this.direccionForm.patchValue({
          estado: respuesta.estado,
          municipio: respuesta.municipio,
          colonia: coloniaSigueValida ? coloniaActual : ''
        });
      });
  }

  // Vuelve al estado "sin resolver" (campos bloqueados y vacíos) cada vez que
  // el CP deja de tener 5 dígitos válidos — evita dejar estado/municipio/
  // colonia de un CP anterior visibles mientras se edita uno nuevo.
  private limpiarResolucionCp(): void {
    this.resolviendoCp.set(false);
    this.cpResuelto.set(false);
    this.cpSinCobertura.set(false);
    this.cpError.set(null);
    this.colonias.set([]);
  }
}
