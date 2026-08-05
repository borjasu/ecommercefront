import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PedidoService } from '../../core/services/pedido.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { ToastService } from '../../core/services/toast.service';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color, DetalleStockInsuficiente } from '../../core/models/producto.model';
import { ColoresService } from '../../core/services/colores.service';
import { formatearNumeroTarjeta, formatearVencimientoTarjeta, soloDigitos } from '../../shared/utils/texto.util';

const LARGO_TELEFONO = 10;
const LARGO_CVV = 4;

type MetodoPago = 'tarjeta' | 'efectivo';

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
  readonly direccionesService = inject(DireccionesService);
  private readonly coloresService = inject(ColoresService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;

  readonly pasoActual = signal<1 | 2 | 3>(1);
  readonly metodoPago = signal<MetodoPago>('tarjeta');
  readonly numeroPedido = signal<string | null>(null);
  readonly direccionSeleccionadaId = signal<string | null>(null);

  readonly envioForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
  });

  // Datos de tarjeta simulados: no hay validación de Luhn ni conexión a ninguna
  // pasarela de pago real, es únicamente para completar la vista del flujo.
  readonly tarjetaForm = this.fb.group({
    numero: [''],
    vencimiento: [''],
    cvv: ['']
  });

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

  onVencimientoInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.tarjetaForm.patchValue({ vencimiento: formatearVencimientoTarjeta(valor) });
  }

  onNumeroTarjetaInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.tarjetaForm.patchValue({ numero: formatearNumeroTarjeta(valor) });
  }

  onCvvInput(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.tarjetaForm.patchValue({ cvv: soloDigitos(valor, LARGO_CVV) });
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

  confirmarPedido(): void {
    const { nombreCompleto, direccion, ciudad, codigoPostal, telefono } = this.envioForm.getRawValue();

    this.pedidoService
      .crearPedido({
        numeroPedido: this.generarNumeroPedido(),
        items: this.items(),
        total: this.total(),
        datosEnvio: {
          nombreCompleto: nombreCompleto!,
          direccion: direccion!,
          ciudad: ciudad!,
          codigoPostal: codigoPostal!,
          telefono: telefono!
        },
        metodoPago: this.metodoPago(),
        emailComprador: this.authService.currentUser()?.email
      })
      .subscribe(resultado => {
        if (!resultado.ok) {
          this.toastService.error(this.mensajeStockInsuficiente(resultado.detalles));
          return;
        }

        this.numeroPedido.set(resultado.pedido.numeroPedido);
        this.cartService.vaciarCarrito();
      });
  }

  private mensajeStockInsuficiente(detalles: DetalleStockInsuficiente[]): string {
    if (detalles.length === 1) {
      const detalle = detalles[0];
      const colorTexto = detalle.color ? `, color ${this.coloresService.etiquetaDe(detalle.color)}` : '';
      return `Ya no hay suficiente stock de "${detalle.productoNombre}" (talla ${detalle.talla}${colorTexto}). Disponible: ${detalle.disponible}.`;
    }

    return `${detalles.length} artículos de tu bolsa ya no tienen stock suficiente. Ajusta las cantidades e intenta de nuevo.`;
  }

  private generarNumeroPedido(): string {
    return `PED-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
