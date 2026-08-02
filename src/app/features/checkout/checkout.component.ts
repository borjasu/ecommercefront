import { Component, ChangeDetectionStrategy, effect, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PedidoService } from '../../core/services/pedido.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { EnviosService } from '../../core/services/envios.service';
import { PagosService } from '../../core/services/pagos.service';
import { MercadoPagoService } from '../../core/services/mercado-pago.service';
import { ColoresService } from '../../core/services/colores.service';
import { OpcionEnvioCardComponent } from '../../shared/components/opcion-envio-card/opcion-envio-card.component';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color } from '../../core/models/producto.model';
import { ResultadoPago } from '../../core/models/pago.model';
import { ItemParaCotizar, OpcionEnvio } from '../../core/models/envio.model';

// Sección "activa" (expandida y editable) del checkout de una sola página —
// nunca cambia de ruta, solo controla qué bloque se ve expandido/colapsado.
type SeccionId = 'direccion' | 'entrega' | 'facturacion';

const ID_CONTENEDOR_BRICK = 'paymentBrick_container';

// Subconjunto representativo del catálogo SAT de regímenes fiscales — no se
// valida contra un catálogo dinámico del SAT (fuera de alcance), es solo un
// selector para capturar el dato cuando el comprador pide factura.
const REGIMENES_FISCALES: { valor: string; etiqueta: string }[] = [
  { valor: '601', etiqueta: '601 - General de Ley Personas Morales' },
  { valor: '603', etiqueta: '603 - Personas Morales con Fines no Lucrativos' },
  { valor: '605', etiqueta: '605 - Sueldos y Salarios' },
  { valor: '606', etiqueta: '606 - Arrendamiento' },
  { valor: '612', etiqueta: '612 - Personas Físicas con Actividad Empresarial' },
  { valor: '616', etiqueta: '616 - Sin obligaciones fiscales' },
  { valor: '621', etiqueta: '621 - Incorporación Fiscal' },
  { valor: '625', etiqueta: '625 - Ingresos por Plataformas Tecnológicas' },
  { valor: '626', etiqueta: '626 - Régimen Simplificado de Confianza' }
];

@Component({
    selector: 'app-checkout',
    imports: [ReactiveFormsModule, RouterLink, OpcionEnvioCardComponent],
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
  private readonly mercadoPagoService = inject(MercadoPagoService);
  private readonly coloresService = inject(ColoresService);
  private readonly router = inject(Router);
  readonly direccionesService = inject(DireccionesService);

  readonly items = this.cartService.itemsCarrito;
  readonly subtotal = this.cartService.total;
  readonly usuario = this.authService.currentUser;

  // Sección actualmente expandida/editable — el resto se muestra colapsada
  // (con resumen + "Cambiar") o ni siquiera aparece todavía si depende de
  // esta. Nunca implica cambiar de URL, es solo estado interno de un único
  // componente de una sola página.
  readonly seccionActiva = signal<SeccionId>('direccion');

  // Dirección --------------------------------------------------------------
  readonly direccionSeleccionadaId = signal<string | null>(null);
  readonly direccionConfirmada = signal(false);
  readonly mostrarNuevaDireccion = signal(false);

  readonly nuevaDireccionForm = this.fb.group({
    alias: ['Casa', [Validators.required]],
    nombreCompleto: ['', [Validators.required]],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[\d\s+()-]{7,15}$/)]]
  });

  readonly direccionElegida = computed(() =>
    this.direccionesService.listado().find(direccion => direccion.id === this.direccionSeleccionadaId()) ?? null
  );

  // Entrega (cotización real a Skydropx) -------------------------------------
  readonly cotizando = signal(false);
  readonly errorCotizacion = signal<string | null>(null);
  readonly opcionesEnvio = signal<OpcionEnvio[]>([]);
  readonly cotizacionId = signal<string | null>(null);
  readonly rateSeleccionado = signal<string | null>(null);
  readonly entregaConfirmada = signal(false);

  readonly opcionEntregaElegida = computed(() =>
    this.opcionesEnvio().find(opcion => opcion.rateId === this.rateSeleccionado()) ?? null
  );
  readonly costoEnvio = computed(() => this.opcionEntregaElegida()?.costo ?? 0);
  readonly totalConEnvio = computed(() => Math.round((this.subtotal() + this.costoEnvio()) * 100) / 100);

  // Facturación (opcional) --------------------------------------------------
  readonly requiereFactura = signal(false);
  readonly facturacionConfirmada = signal(false);
  readonly regimenesFiscales = REGIMENES_FISCALES;

  readonly facturaForm = this.fb.group({
    rfc: ['', [Validators.required, Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i)]],
    razonSocial: ['', [Validators.required]],
    regimenFiscal: ['', [Validators.required]]
  });

  // Pago — Payment Brick de Mercado Pago, montado inline en esta misma
  // sección/página (nunca en otra ruta ni con recarga). -------------------
  readonly pedidoActual = signal<{ id: string; numeroPedido: string } | null>(null);
  readonly preferenceId = signal<string | null>(null);
  readonly amountPreferencia = signal<number | null>(null);
  readonly brickListo = signal(false);

  readonly procesando = signal(false);
  readonly errorPago = signal<string | null>(null);
  readonly numeroPedido = signal<string | null>(null);
  readonly resultadoPagoFinal = signal<ResultadoPago | null>(null);

  constructor() {
    if (this.cartService.itemsCarrito().length === 0) {
      this.router.navigate(['/carrito']);
    }

    const usuario = this.authService.currentUser();
    if (usuario) {
      this.nuevaDireccionForm.patchValue({ nombreCompleto: usuario.nombre });
    }

    // La lista de direcciones se carga de forma asíncrona (HTTP) — este efecto
    // reacciona en cuanto llegue, en vez de leerla una sola vez en el constructor.
    effect(() => {
      const direcciones = this.direccionesService.listado();
      if (!this.direccionSeleccionadaId() && direcciones.length > 0) {
        const predeterminada = direcciones.find(direccion => direccion.predeterminada) ?? direcciones[0];
        this.direccionSeleccionadaId.set(predeterminada.id);
      }
    });

    // Una vez confirmada la facturación (con o sin factura), se dispara el
    // pago de inmediato — sin ningún selector/pantalla intermedia nuestra: el
    // Payment Brick ya trae su propio selector de método integrado.
    effect(() => {
      if (this.facturacionConfirmada() && !this.pedidoActual()) {
        this.iniciarPago();
      }
    });
  }

  subtotalLinea(item: ItemCarrito): number {
    return (item.producto.precioFinal ?? item.producto.precio) * item.cantidad;
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  // ---------- Dirección ----------
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

  confirmarDireccion(): void {
    if (!this.direccionSeleccionadaId()) {
      return;
    }
    this.direccionConfirmada.set(true);
    this.seccionActiva.set('entrega');
    this.cotizar();
  }

  cambiarDireccion(): void {
    if (this.pedidoActual()) {
      return; // ya se creó el pedido con estos datos, no se puede editar a medias
    }
    this.direccionConfirmada.set(false);
    this.entregaConfirmada.set(false);
    this.facturacionConfirmada.set(false);
    this.seccionActiva.set('direccion');
  }

  // ---------- Entrega ----------
  reintentarCotizacion(): void {
    this.cotizar();
  }

  seleccionarEntrega(rateId: string): void {
    this.rateSeleccionado.set(rateId);
    this.entregaConfirmada.set(true);
    this.seccionActiva.set('facturacion');
  }

  cambiarEntrega(): void {
    if (this.pedidoActual()) {
      return;
    }
    this.entregaConfirmada.set(false);
    this.facturacionConfirmada.set(false);
    this.seccionActiva.set('entrega');
  }

  // ---------- Facturación ----------
  confirmarFacturacion(): void {
    if (this.requiereFactura() && this.facturaForm.invalid) {
      this.facturaForm.markAllAsTouched();
      return;
    }
    this.facturacionConfirmada.set(true);
  }

  cambiarFacturacion(): void {
    if (this.pedidoActual()) {
      return;
    }
    this.facturacionConfirmada.set(false);
    this.seccionActiva.set('facturacion');
  }

  // ---------- Pago ----------
  private iniciarPago(): void {
    const direccionId = this.direccionSeleccionadaId();
    const cotizacionId = this.cotizacionId();
    const rateId = this.rateSeleccionado();
    if (!direccionId || !cotizacionId || !rateId) {
      return;
    }

    this.procesando.set(true);
    this.errorPago.set(null);

    const facturaValores = this.requiereFactura() ? this.facturaForm.getRawValue() : null;

    this.pedidoService
      .crearPedido({
        items: this.itemsParaBackend(),
        direccionId,
        cotizacionId,
        rateId,
        metodoPago: 'tarjeta',
        ...(facturaValores && {
          datosFiscales: {
            rfc: facturaValores.rfc!,
            razonSocial: facturaValores.razonSocial!,
            regimenFiscal: facturaValores.regimenFiscal!
          }
        })
      })
      .subscribe({
        next: pedido => {
          this.pedidoActual.set({ id: pedido.id, numeroPedido: pedido.numeroPedido });
          this.iniciarPreferencia(pedido.id);
        },
        error: () => {
          this.errorPago.set(
            'No pudimos crear tu pedido. La cotización de envío pudo haber expirado — vuelve a cotizar.'
          );
          this.procesando.set(false);
          this.facturacionConfirmada.set(false);
        }
      });
  }

  private iniciarPreferencia(pedidoId: string): void {
    this.pagosService.crearPreferencia(pedidoId).subscribe({
      next: ({ preferenceId, amount }) => {
        this.preferenceId.set(preferenceId);
        this.amountPreferencia.set(amount);
        this.procesando.set(false);
        // setTimeout: el contenedor del Brick se renderiza en el template a
        // partir de preferenceId() — se difiere un tick para asegurar que ese
        // <div> ya exista en el DOM antes de que el SDK intente montarse ahí.
        setTimeout(() => this.montarBrick(amount, preferenceId));
      },
      error: () => {
        this.errorPago.set('No pudimos iniciar el pago. Intenta de nuevo.');
        this.procesando.set(false);
      }
    });
  }

  private async montarBrick(amount: number, preferenceId: string): Promise<void> {
    const usuario = this.authService.currentUser();
    const partesNombre = (usuario?.nombre ?? '').trim().split(/\s+/);

    await this.mercadoPagoService.montarPaymentBrick(ID_CONTENEDOR_BRICK, {
      initialization: {
        amount,
        preferenceId,
        payer: {
          firstName: partesNombre[0] ?? '',
          lastName: partesNombre.slice(1).join(' '),
          email: usuario?.email
        }
      },
      customization: {
        visual: {
          style: {
            theme: 'default',
            // Colores reales de marca (ver src/styles.css) — no inventados.
            // outline*/baseColorFirstVariant cubren foco, hover y el indicador
            // de carga del propio formulario del Brick — sin ellas, esos
            // estados se quedan en el azul default de Mercado Pago aunque
            // baseColor ya esté en dorado.
            customVariables: {
              baseColor: '#c9a227', // --color-brand-gold
              baseColorFirstVariant: '#e8c468', // --color-brand-gold-light (hover)
              textPrimaryColor: '#14110d', // --color-brand-ink
              textSecondaryColor: '#7a7568', // --color-brand-muted
              outlinePrimaryColor: '#c9a227', // --color-brand-gold (foco/carga)
              outlineSecondaryColor: '#c9a227',
              buttonTextColor: '#14110d', // --color-brand-ink
              formBackgroundColor: '#ffffff',
              borderRadiusMedium: '2px' // mismo radio casi-recto que .btn-gold/.input-field
            }
          }
        },
        paymentMethods: {
          creditCard: 'all',
          debitCard: 'all',
          ticket: 'all', // pago en efectivo (OXXO y similares) — clave en México
          bankTransfer: 'all',
          maxInstallments: 3 // negocio pequeño, no conviene ofrecer más meses
        }
      },
      callbacks: {
        onReady: () => this.brickListo.set(true),
        onSubmit: ({ formData }) =>
          new Promise<void>((resolve, reject) => {
            const pedido = this.pedidoActual();
            if (!pedido) {
              reject(new Error('No hay un pedido activo para pagar.'));
              return;
            }

            this.procesando.set(true);
            this.errorPago.set(null);

            this.pagosService.procesar(pedido.id, formData).subscribe({
              next: resultado => {
                this.manejarResultadoPago(resultado, pedido.numeroPedido);
                resolve();
              },
              error: () => {
                this.errorPago.set('No pudimos procesar tu pago. Intenta de nuevo.');
                this.procesando.set(false);
                reject(new Error('Fallo al procesar el pago.'));
              }
            });
          }),
        onError: () => {
          this.errorPago.set('Ocurrió un error con el widget de pago. Intenta de nuevo.');
          this.procesando.set(false);
        }
      }
    });
  }

  private manejarResultadoPago(resultado: ResultadoPago, numeroPedido: string): void {
    if (resultado === 'rechazado') {
      // El Brick ya muestra el motivo del rechazo y deja reintentar sin
      // perder los datos de envío/facturación ya confirmados (sigue montado).
      this.errorPago.set('Tu pago fue rechazado. Puedes intentar de nuevo con otro método dentro del mismo formulario.');
      this.procesando.set(false);
      return;
    }

    // 'pendiente' cubre tickets (OXXO) y transferencias que tardan en
    // confirmarse — el webhook (fuente de verdad definitiva) actualiza el
    // pedido cuando el pago realmente se complete, esto solo confirma que el
    // pedido quedó registrado. La confirmación se muestra en la MISMA
    // experiencia (sin salto de página), solo cambia lo que se ve dentro del
    // mismo componente de checkout.
    this.mercadoPagoService.desmontarBrick();
    this.cartService.vaciarCarrito();
    this.numeroPedido.set(numeroPedido);
    this.resultadoPagoFinal.set(resultado);
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
