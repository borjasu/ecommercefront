import { Component, ChangeDetectionStrategy, effect, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PedidoService } from '../../core/services/pedido.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { EnviosService } from '../../core/services/envios.service';
import { PagosService } from '../../core/services/pagos.service';
import { ColoresService } from '../../core/services/colores.service';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color } from '../../core/models/producto.model';
import { MetodoPago } from '../../core/models/pedido.model';
import { ItemParaCotizar, OpcionEnvio } from '../../core/models/envio.model';

type Paso = 1 | 2 | 3 | 4;

@Component({
    selector: 'app-checkout',
    imports: [ReactiveFormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './checkout.component.html'
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly pedidoService = inject(PedidoService);
  private readonly enviosService = inject(EnviosService);
  private readonly pagosService = inject(PagosService);
  private readonly coloresService = inject(ColoresService);
  private readonly router = inject(Router);
  readonly direccionesService = inject(DireccionesService);

  readonly items = this.cartService.itemsCarrito;
  readonly subtotal = this.cartService.total;

  readonly pasoActual = signal<Paso>(1);

  // Paso 2: dirección ---------------------------------------------------
  readonly direccionSeleccionadaId = signal<string | null>(null);
  readonly mostrarNuevaDireccion = signal(false);

  readonly nuevaDireccionForm = this.fb.group({
    alias: ['Casa', [Validators.required]],
    nombreCompleto: ['', [Validators.required]],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[\d\s+()-]{7,15}$/)]]
  });

  // Paso 3: cotización de envío (llamada real a Skydropx, tarda unos segundos) ----
  readonly cotizando = signal(false);
  readonly errorCotizacion = signal<string | null>(null);
  readonly opcionesEnvio = signal<OpcionEnvio[]>([]);
  readonly cotizacionId = signal<string | null>(null);
  readonly rateSeleccionado = signal<string | null>(null);

  readonly costoEnvio = computed(
    () => this.opcionesEnvio().find(opcion => opcion.rateId === this.rateSeleccionado())?.costo ?? 0
  );
  readonly totalConEnvio = computed(() => Math.round((this.subtotal() + this.costoEnvio()) * 100) / 100);

  // Paso 4: pago (llamada real a Mercado Pago) ---------------------------
  readonly metodoPago = signal<MetodoPago>('tarjeta');

  readonly tarjetaForm = this.fb.group({
    numero: ['', [Validators.required]],
    nombreTitular: ['', [Validators.required]],
    mesVencimiento: ['', [Validators.required]],
    anioVencimiento: ['', [Validators.required]],
    cvv: ['', [Validators.required]],
    paymentMethodId: ['visa', [Validators.required]]
  });

  readonly procesando = signal(false);
  readonly errorPago = signal<string | null>(null);
  readonly numeroPedido = signal<string | null>(null);

  constructor() {
    if (this.cartService.itemsCarrito().length === 0) {
      this.router.navigate(['/carrito']);
    }

    const usuario = this.authService.currentUser();
    if (usuario) {
      this.nuevaDireccionForm.patchValue({ nombreCompleto: usuario.nombre });
    }

    // La lista de direcciones se carga de forma asíncrona (HTTP) — este efecto
    // reacciona en cuanto llegue, en vez de leerla una sola vez en el constructor
    // (que podría correr antes de que la petición termine).
    effect(() => {
      const direcciones = this.direccionesService.listado();
      if (!this.direccionSeleccionadaId() && direcciones.length > 0) {
        const predeterminada = direcciones.find(direccion => direccion.predeterminada) ?? direcciones[0];
        this.direccionSeleccionadaId.set(predeterminada.id);
      }
    });
  }

  subtotalLinea(item: ItemCarrito): number {
    return (item.producto.precioFinal ?? item.producto.precio) * item.cantidad;
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  irAPaso(paso: Paso): void {
    this.pasoActual.set(paso);
  }

  pasoAnterior(): void {
    this.pasoActual.update(paso => (paso > 1 ? ((paso - 1) as Paso) : paso));
  }

  seleccionarDireccion(id: string): void {
    this.direccionSeleccionadaId.set(id);
  }

  abrirNuevaDireccion(): void {
    this.mostrarNuevaDireccion.set(true);
    this.nuevaDireccionForm.reset({
      alias: 'Casa',
      nombreCompleto: this.authService.currentUser()?.nombre ?? '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      telefono: ''
    });
  }

  cancelarNuevaDireccion(): void {
    this.mostrarNuevaDireccion.set(false);
  }

  guardarNuevaDireccion(): void {
    if (this.nuevaDireccionForm.invalid) {
      this.nuevaDireccionForm.markAllAsTouched();
      return;
    }

    const valores = this.nuevaDireccionForm.getRawValue();
    const esPrimera = this.direccionesService.listado().length === 0;

    this.direccionesService
      .crearYObtener({
        alias: valores.alias!,
        nombreCompleto: valores.nombreCompleto!,
        direccion: valores.direccion!,
        ciudad: valores.ciudad!,
        codigoPostal: valores.codigoPostal!,
        telefono: valores.telefono!,
        predeterminada: esPrimera
      })
      .subscribe(direccion => {
        this.direccionSeleccionadaId.set(direccion.id);
        this.mostrarNuevaDireccion.set(false);
      });
  }

  irAPasoEnvio(): void {
    if (!this.direccionSeleccionadaId()) {
      return;
    }
    this.pasoActual.set(3);
    this.cotizar();
  }

  reintentarCotizacion(): void {
    this.cotizar();
  }

  seleccionarRate(rateId: string): void {
    this.rateSeleccionado.set(rateId);
  }

  irAPasoPago(): void {
    if (!this.rateSeleccionado()) {
      return;
    }
    this.pasoActual.set(4);
  }

  async confirmarPedido(): Promise<void> {
    const direccionId = this.direccionSeleccionadaId();
    const cotizacionId = this.cotizacionId();
    const rateId = this.rateSeleccionado();
    if (!direccionId || !cotizacionId || !rateId) {
      return;
    }

    if (this.metodoPago() === 'tarjeta' && this.tarjetaForm.invalid) {
      this.tarjetaForm.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    this.errorPago.set(null);

    this.pedidoService
      .crearPedido({
        items: this.itemsParaBackend(),
        direccionId,
        cotizacionId,
        rateId,
        metodoPago: this.metodoPago()
      })
      .subscribe({
        next: pedido => {
          if (this.metodoPago() === 'efectivo') {
            this.finalizarConExito(pedido.numeroPedido);
            return;
          }
          this.pagarConTarjeta(pedido.id, pedido.numeroPedido);
        },
        error: () => {
          this.errorPago.set(
            'No pudimos crear tu pedido. La cotización de envío pudo haber expirado — vuelve a cotizar.'
          );
          this.procesando.set(false);
        }
      });
  }

  private pagarConTarjeta(pedidoId: string, numeroPedido: string): void {
    const valores = this.tarjetaForm.getRawValue();

    this.pagosService
      .tokenizarTarjeta({
        numero: valores.numero!,
        nombreTitular: valores.nombreTitular!,
        mesVencimiento: valores.mesVencimiento!,
        anioVencimiento: valores.anioVencimiento!,
        cvv: valores.cvv!
      })
      .pipe(switchMap(token => this.pagosService.procesar(pedidoId, token, valores.paymentMethodId!)))
      .subscribe({
        next: resultado => {
          if (resultado === 'rechazado') {
            this.errorPago.set('Tu pago fue rechazado. Verifica los datos de tu tarjeta o elige efectivo/transferencia.');
            this.procesando.set(false);
            return;
          }
          this.finalizarConExito(numeroPedido);
        },
        error: () => {
          this.errorPago.set('No pudimos procesar tu pago. Verifica los datos de tu tarjeta.');
          this.procesando.set(false);
        }
      });
  }

  private finalizarConExito(numeroPedido: string): void {
    this.cartService.vaciarCarrito();
    this.numeroPedido.set(numeroPedido);
    this.procesando.set(false);
  }

  private cotizar(): void {
    const direccionId = this.direccionSeleccionadaId();
    if (!direccionId) {
      return;
    }

    this.cotizando.set(true);
    this.errorCotizacion.set(null);
    this.opcionesEnvio.set([]);
    this.rateSeleccionado.set(null);

    this.enviosService.cotizar(direccionId, this.itemsParaBackend()).subscribe({
      next: respuesta => {
        this.cotizacionId.set(respuesta.cotizacionId);
        this.opcionesEnvio.set(respuesta.opciones);
        if (respuesta.opciones.length > 0) {
          this.rateSeleccionado.set(respuesta.opciones[0].rateId);
        }
        this.cotizando.set(false);
      },
      error: () => {
        this.errorCotizacion.set('No pudimos cotizar el envío para esta dirección. Intenta de nuevo.');
        this.cotizando.set(false);
      }
    });
  }

  private itemsParaBackend(): ItemParaCotizar[] {
    return this.items().map(item => ({
      productoId: item.producto.id,
      talla: item.talla,
      color: item.color ?? '',
      cantidad: item.cantidad
    }));
  }
}
