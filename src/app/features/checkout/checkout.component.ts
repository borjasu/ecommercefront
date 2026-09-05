import { Component, ChangeDetectionStrategy, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { EnvioService, OpcionEnvio } from '../../core/services/envio.service';
import { PagoService, ProcesarPagoPayload } from '../../core/services/pago.service';
import { PedidoCompradorService } from '../../core/services/pedido-comprador.service';
import { ToastService } from '../../core/services/toast.service';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color, DetalleStockInsuficiente, ItemStockSolicitado, SIN_COLOR } from '../../core/models/producto.model';
import { PedidoDetalle } from '../../core/models/pedido.model';
import { ColoresService } from '../../core/services/colores.service';
import { mensajeDeErrorHttp } from '../../shared/utils/http-error.util';
import { soloDigitos } from '../../shared/utils/texto.util';

const LARGO_TELEFONO = 10;

type MetodoPago = 'tarjeta' | 'efectivo';
type ResultadoPago = 'aprobado' | 'pendiente' | 'rechazado';

// SDK de mercadopago.js (cargado como <script> en index.html) — no tiene un
// paquete de tipos oficial para el SDK vainilla v2, así que la configuración
// del Brick se tipa como `unknown`/`any` igual que en los ejemplos oficiales.
declare const MercadoPago: {
  new (publicKey: string, opciones?: { locale?: string }): {
    bricks: () => {
      create: (tipo: 'payment', contenedorId: string, configuracion: unknown) => Promise<{ unmount: () => void }>;
    };
  };
};

@Component({
    selector: 'app-checkout',
    imports: [ReactiveFormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './checkout.component.html'
})
export class CheckoutComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly productoService = inject(ProductoService);
  private readonly envioService = inject(EnvioService);
  private readonly pagoService = inject(PagoService);
  private readonly pedidoCompradorService = inject(PedidoCompradorService);
  private readonly http = inject(HttpClient);
  readonly direccionesService = inject(DireccionesService);
  private readonly coloresService = inject(ColoresService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;

  readonly pasoActual = signal<1 | 2 | 3>(1);
  readonly metodoPago = signal<MetodoPago>('tarjeta');
  readonly direccionSeleccionadaId = signal<string | null>(null);

  // Paso 3: preparar el pago (dirección real + cotización de envío + pedido +
  // preferencia, ver `continuarAlPago`) y luego el Payment Brick embebido.
  readonly preparandoPago = signal(false);
  readonly errorPreparacion = signal<string | null>(null);
  readonly opcionEnvio = signal<OpcionEnvio | null>(null);
  readonly pedidoCreado = signal<PedidoDetalle | null>(null);
  readonly pagando = signal(false);
  readonly resultadoPago = signal<ResultadoPago | null>(null);

  // Solo se usa para mostrar la pantalla final: aprobado/pendiente muestran
  // "gracias", rechazado se resuelve dentro del paso 3 (botón "Intentar de
  // nuevo" → `reintentarPago`).
  readonly numeroPedidoFinal = signal<string | null>(null);

  readonly envioForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
  });

  private mercadoPago?: InstanceType<typeof MercadoPago>;
  private brickControlador?: { unmount: () => void };

  constructor() {
    if (this.cartService.itemsCarrito().length === 0) {
      this.router.navigate(['/carrito']);
    }

    const usuario = this.authService.currentUser();
    if (usuario) {
      this.envioForm.patchValue({ nombreCompleto: usuario.nombre, email: usuario.email });
    }

    const predeterminada = this.direccionesService.listado().find(direccion => direccion.predeterminada);
    if (predeterminada) {
      this.usarDireccionGuardada(predeterminada.id);
    }
  }

  ngOnDestroy(): void {
    this.brickControlador?.unmount();
  }

  usarDireccionGuardada(id: string): void {
    const direccion = this.direccionesService.listado().find(d => d.id === id);
    if (!direccion) {
      return;
    }

    this.direccionSeleccionadaId.set(id);
    this.envioForm.patchValue({
      nombreCompleto: direccion.nombreCompleto,
      direccion: direccion.direccion,
      ciudad: direccion.ciudad,
      codigoPostal: direccion.codigoPostal,
      telefono: direccion.telefono
    });
  }

  subtotalLinea(item: ItemCarrito): number {
    return item.producto.precio * item.cantidad;
  }

  onTelefonoInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.envioForm.patchValue({ telefono: soloDigitos(valor, LARGO_TELEFONO) });
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  siguientePaso(): void {
    if (this.pasoActual() === 2 && this.envioForm.invalid) {
      this.envioForm.markAllAsTouched();
      return;
    }

    this.pasoActual.update(paso => (paso < 3 ? ((paso + 1) as 1 | 2 | 3) : paso));
  }

  pasoAnterior(): void {
    this.pasoActual.update(paso => (paso > 1 ? ((paso - 1) as 1 | 2 | 3) : paso));
  }

  // Dispara toda la cadena real contra el backend: dirección → cotización de
  // envío → creación del pedido → preferencia de Mercado Pago → montar el
  // Payment Brick. Se llama al elegir método de pago en el paso 3, no antes
  // (así el comprador puede seguir ajustando el paso 2 sin crear nada todavía).
  continuarAlPago(): void {
    const verificacion = this.productoService.verificarStockDisponible(this.itemsStockActuales());
    // Mismo chequeo que ya existía antes de conectar el backend real: el
    // modelo de productos de ecommerceback todavía no tiene control de stock
    // por unidad (ver nota en producto.service.ts), así que esta sigue siendo
    // la única validación de cantidad disponible en toda la app.
    if (!verificacion.ok) {
      this.toastService.error(this.mensajeStockInsuficiente(verificacion.detalles));
      return;
    }

    this.preparandoPago.set(true);
    this.errorPreparacion.set(null);

    const { nombreCompleto, direccion, ciudad, codigoPostal, telefono } = this.envioForm.getRawValue();
    const itemsPedido = this.itemsPedidoActuales();

    this.crearDireccionTemporal({
      nombreCompleto: nombreCompleto!,
      direccion: direccion!,
      ciudad: ciudad!,
      codigoPostal: codigoPostal!,
      telefono: telefono!
    })
      .pipe(
        switchMap(direccionCreada =>
          this.envioService.cotizar(direccionCreada.id, itemsPedido).pipe(
            switchMap(cotizacion => {
              const mejorOpcion = [...cotizacion.opciones].sort((a, b) => a.costo - b.costo)[0];
              if (!mejorOpcion) {
                throw new Error('No hay opciones de envío disponibles para esa dirección.');
              }
              this.opcionEnvio.set(mejorOpcion);
              return this.pedidoCompradorService.crear({
                items: itemsPedido,
                direccionId: direccionCreada.id,
                cotizacionId: cotizacion.cotizacionId,
                rateId: mejorOpcion.rateId,
                metodoPago: this.metodoPago()
              });
            }),
            switchMap(pedido => {
              this.pedidoCreado.set(pedido);
              return this.pagoService.crearPreferencia(pedido.id);
            })
          )
        )
      )
      .subscribe({
        next: respuesta => {
          this.preparandoPago.set(false);
          setTimeout(() => this.montarBrick(respuesta.preferenceId), 0);
        },
        error: (error: unknown) => {
          this.preparandoPago.set(false);
          this.errorPreparacion.set(
            error instanceof HttpErrorResponse ? mensajeDeErrorHttp(error) : 'No se pudo preparar el pago. Intenta de nuevo.'
          );
        }
      });
  }

  // El pedido y la dirección ya existen (se creó en `continuarAlPago`) — un
  // pago rechazado solo necesita una preferencia nueva para volver a montar
  // el Brick, no repetir toda la cadena.
  reintentarPago(): void {
    const pedido = this.pedidoCreado();
    if (!pedido) {
      return;
    }

    this.resultadoPago.set(null);
    this.brickControlador?.unmount();
    this.brickControlador = undefined;
    this.preparandoPago.set(true);

    this.pagoService.crearPreferencia(pedido.id).subscribe({
      next: respuesta => {
        this.preparandoPago.set(false);
        setTimeout(() => this.montarBrick(respuesta.preferenceId), 0);
      },
      error: (error: HttpErrorResponse) => {
        this.preparandoPago.set(false);
        this.toastService.error(mensajeDeErrorHttp(error));
      }
    });
  }

  private itemsStockActuales(): ItemStockSolicitado[] {
    return this.items().map(item => ({
      productoId: item.producto.id,
      talla: item.talla,
      color: item.color,
      cantidad: item.cantidad
    }));
  }

  private itemsPedidoActuales(): { productoId: string; talla: string; color: string; cantidad: number }[] {
    return this.itemsStockActuales().map(item => ({ ...item, color: item.color ?? SIN_COLOR }));
  }

  private crearDireccionTemporal(datos: {
    nombreCompleto: string;
    direccion: string;
    ciudad: string;
    codigoPostal: string;
    telefono: string;
  }) {
    // NOTA TEMPORAL (decisión explícita del día 3 del sprint): DireccionesService
    // sigue siendo 100% mock/localStorage — no tiene ids reales de la BD, y
    // POST /pedidos y POST /envios/cotizar exigen un direccionId real. Mientras
    // no se conecte esa migración (día futuro), aquí se crea una dirección real
    // contra el backend con los datos que el comprador ya llenó en el paso 2,
    // solo para tener un id válido con el que cotizar y crear el pedido. No
    // reemplaza esa migración: cada checkout inserta una fila nueva en
    // `direcciones`, no gestiona ni reutiliza un catálogo real todavía.
    return this.http.post<{ id: string }>(
      `${environment.apiUrl}/direcciones`,
      { alias: 'Checkout', ...datos },
      { withCredentials: true }
    );
  }

  private montarBrick(preferenceId: string): void {
    const pedido = this.pedidoCreado();
    if (!pedido) {
      return;
    }

    this.mercadoPago ??= new MercadoPago(environment.mercadoPagoPublicKey, { locale: 'es-MX' });
    const esTarjeta = this.metodoPago() === 'tarjeta';

    this.mercadoPago
      .bricks()
      .create('payment', 'brick-pago-container', {
        initialization: {
          amount: pedido.total,
          preferenceId,
          payer: { email: this.authService.currentUser()?.email }
        },
        customization: {
          paymentMethods: esTarjeta
            ? { creditCard: 'all', debitCard: 'all', prepaidCard: 'all', ticket: 'none', bankTransfer: 'none', mercadoPago: 'none', atm: 'none' }
            : { creditCard: 'none', debitCard: 'none', prepaidCard: 'none', ticket: 'all', bankTransfer: 'all', mercadoPago: 'none', atm: 'none' }
        },
        callbacks: {
          onReady: () => {},
          onError: () => {
            this.toastService.error('Ocurrió un error al cargar el formulario de pago.');
          },
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) =>
            new Promise<void>((resolve, reject) => {
              this.pagando.set(true);
              const payload = { ...formData, pedidoId: pedido.id } as unknown as ProcesarPagoPayload;
              this.pagoService.procesar(payload).subscribe({
                next: respuesta => {
                  this.pagando.set(false);
                  this.resultadoPago.set(respuesta.resultado);
                  this.confirmarContraBackend(pedido.id, respuesta.resultado);
                  resolve();
                },
                error: (error: HttpErrorResponse) => {
                  this.pagando.set(false);
                  this.toastService.error(mensajeDeErrorHttp(error));
                  reject();
                }
              });
            })
        }
      })
      .then(controlador => {
        this.brickControlador = controlador;
      });
  }

  // Nunca se refleja `resultado` (la respuesta síncrona de /pagos/procesar)
  // como estado final sin antes volver a consultar el pedido real: es la
  // única forma de estar seguros de lo que el backend (y, en última
  // instancia, el webhook de Mercado Pago) realmente confirmó.
  private confirmarContraBackend(pedidoId: string, resultado: ResultadoPago): void {
    this.pedidoCompradorService.obtenerPorId(pedidoId).subscribe({
      next: pedidoActualizado => {
        this.pedidoCreado.set(pedidoActualizado);
        this.finalizarSegunResultado(resultado, pedidoActualizado.numeroPedido);
      },
      // Si el GET de confirmación falla (red caída, etc.) igual se refleja el
      // resultado síncrono que sí llegó — no se deja al comprador sin
      // respuesta; "Mis pedidos" siempre parte de una consulta fresca, así
      // que verá el estado real apenas la conexión se restablezca.
      error: () => this.finalizarSegunResultado(resultado, this.pedidoCreado()?.numeroPedido ?? '')
    });
  }

  private finalizarSegunResultado(resultado: ResultadoPago, numeroPedido: string): void {
    if (resultado === 'rechazado') {
      this.toastService.error('Tu pago fue rechazado. Puedes intentar de nuevo con otro método o tarjeta.');
      return;
    }

    // Solo aquí se descuenta el stock local y se vacía el carrito: el pedido
    // ya está realmente creado Y el pago realmente aprobado o en curso
    // (pendiente = p. ej. eligió pagar en efectivo/OXXO) — nunca antes.
    this.productoService.descontarStock(this.itemsStockActuales());
    this.cartService.vaciarCarrito();
    this.numeroPedidoFinal.set(numeroPedido);
  }

  private mensajeStockInsuficiente(detalles: DetalleStockInsuficiente[]): string {
    if (detalles.length === 1) {
      const detalle = detalles[0];
      const colorTexto = detalle.color ? `, color ${this.coloresService.etiquetaDe(detalle.color)}` : '';
      return `Ya no hay suficiente stock de "${detalle.productoNombre}" (talla ${detalle.talla}${colorTexto}). Disponible: ${detalle.disponible}.`;
    }

    return `${detalles.length} artículos de tu bolsa ya no tienen stock suficiente. Ajusta las cantidades e intenta de nuevo.`;
  }
}
