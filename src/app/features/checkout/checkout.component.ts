import { Component, ChangeDetectionStrategy, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductoService } from '../../core/services/producto.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { CodigosPostalesService, ColoniaCp } from '../../core/services/codigos-postales.service';
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
import { resolverImagenProducto } from '../../shared/utils/producto-imagen.util';

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
  private readonly codigosPostalesService = inject(CodigosPostalesService);
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

  // Estado de la resolución del código postal contra el catálogo SEPOMEX
  // (GET /codigos-postales/:cp, ver CodigosPostalesService) — sin esto no
  // hay forma de distinguir "todavía no se ha tecleado un CP válido", "el
  // catálogo lo encontró" (estado/municipio se bloquean, colonia es un
  // selector) y "hueco de cobertura" (estado/municipio/colonia se vuelven
  // editables a mano, ver auditoría del prompt).
  readonly resolviendoCp = signal(false);
  readonly cpResuelto = signal(false);
  readonly cpSinCobertura = signal(false);
  readonly cpError = signal<string | null>(null);
  readonly colonias = signal<ColoniaCp[]>([]);

  readonly envioForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    calle: ['', [Validators.required]],
    numeroExterior: ['', [Validators.required]],
    numeroInterior: [''],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    colonia: ['', [Validators.required]],
    municipio: ['', [Validators.required]],
    estado: ['', [Validators.required]],
    referencias: [''],
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

    this.observarCodigoPostal();
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
    // La dirección guardada (DireccionesService sigue siendo 100% mock local,
    // ver auditoría del prompt) no tiene calle/colonia/estado/municipio por
    // separado, solo un texto libre — se completa lo que sí mapea 1 a 1 y se
    // deja "calle" con ese texto como punto de partida editable. El patchValue
    // de codigoPostal dispara la misma resolución contra el catálogo SEPOMEX
    // que si el comprador lo hubiera tecleado a mano (ver observarCodigoPostal),
    // así estado/municipio/colonia se llenan con datos reales, no con el mock.
    this.envioForm.patchValue({
      nombreCompleto: direccion.nombreCompleto,
      calle: direccion.direccion,
      codigoPostal: direccion.codigoPostal,
      telefono: direccion.telefono
    });
  }

  // Debounce de 400ms tras dejar de escribir el CP (cubre igual el caso de
  // perder el foco, que solo dispararía esto un poco antes) — resuelve
  // estado/municipio/colonia contra GET /codigos-postales/:cp.
  private observarCodigoPostal(): void {
    this.envioForm.controls.codigoPostal.valueChanges
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
              this.envioForm.patchValue({ estado: '', municipio: '', colonia: '' });
              this.cpError.set(
                error.status === 404
                  ? 'No encontramos ese código postal, verifícalo. Puedes completar estado, municipio y colonia manualmente.'
                  : 'No pudimos verificar el código postal. Puedes completar estado, municipio y colonia manualmente.'
              );
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(respuesta => {
        this.resolviendoCp.set(false);
        this.cpResuelto.set(true);
        this.cpSinCobertura.set(false);
        this.colonias.set(respuesta.colonias);
        this.envioForm.patchValue({
          estado: respuesta.estado,
          municipio: respuesta.municipio,
          colonia: ''
        });
      });
  }

  // Vuelve al estado "sin resolver" (campos bloqueados y vacíos) cada vez que
  // el CP deja de tener 5 dígitos válidos — evita dejar estado/municipio/
  // colonia de un CP anterior visibles mientras el comprador edita uno nuevo.
  private limpiarResolucionCp(): void {
    this.resolviendoCp.set(false);
    this.cpResuelto.set(false);
    this.cpSinCobertura.set(false);
    this.cpError.set(null);
    this.colonias.set([]);
    this.envioForm.patchValue({ estado: '', municipio: '', colonia: '' });
  }

  // Usa el mismo precio efectivo que ya vio en el carrito (normal o de
  // mayoreo, ver CartService.precioUnitarioEfectivo) — solo es la vista previa
  // antes de pagar, el cálculo autoritativo real vuelve a hacerlo el backend
  // al crear el pedido (OrdersService.crear), ignorando cualquier precio que
  // mande el frontend.
  subtotalLinea(item: ItemCarrito): number {
    return this.cartService.precioUnitarioEfectivo(item) * item.cantidad;
  }

  aplicaMayoreo(item: ItemCarrito): boolean {
    return this.cartService.aplicaMayoreo(item);
  }

  imagenDe(item: ItemCarrito): string {
    return resolverImagenProducto(item.producto);
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

    const {
      nombreCompleto,
      calle,
      numeroExterior,
      numeroInterior,
      colonia,
      municipio,
      estado,
      codigoPostal,
      referencias,
      telefono
    } = this.envioForm.getRawValue();
    const itemsPedido = this.itemsPedidoActuales();

    this.crearDireccionTemporal({
      nombreCompleto: nombreCompleto!,
      calle: calle!,
      numeroExterior: numeroExterior!,
      numeroInterior: numeroInterior || null,
      colonia: colonia!,
      municipio: municipio!,
      estado: estado!,
      codigoPostal: codigoPostal!,
      referencias: referencias || null,
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
    calle: string;
    numeroExterior: string;
    numeroInterior: string | null;
    colonia: string;
    municipio: string;
    estado: string;
    codigoPostal: string;
    referencias: string | null;
    telefono: string;
  }) {
    // NOTA TEMPORAL (decisión explícita del día 3 del sprint): DireccionesService
    // sigue siendo 100% mock/localStorage — no tiene ids reales de la BD, y
    // POST /pedidos y POST /envios/cotizar exigen un direccionId real. Mientras
    // no se conecte esa migración (día futuro), aquí se crea una dirección real
    // contra el backend con los datos que el comprador ya llenó en el paso 2
    // (ahora estructurados vía SEPOMEX, ver observarCodigoPostal), solo para
    // tener un id válido con el que cotizar y crear el pedido. No reemplaza
    // esa migración: cada checkout inserta una fila nueva en `direcciones`,
    // no gestiona ni reutiliza un catálogo real todavía.
    return this.http.post<{ id: string }>(
      `${environment.apiUrl}/direcciones`,
      {
        alias: 'Checkout',
        nombreCompleto: datos.nombreCompleto,
        calle: datos.calle,
        numeroExterior: datos.numeroExterior,
        numeroInterior: datos.numeroInterior || undefined,
        colonia: datos.colonia,
        municipio: datos.municipio,
        estado: datos.estado,
        codigoPostal: datos.codigoPostal,
        referencias: datos.referencias || undefined,
        telefono: datos.telefono
      },
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
