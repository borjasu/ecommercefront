import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PedidoService } from '../../core/services/pedido.service';
import { ItemCarrito } from '../../core/models/carrito.model';

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
  private readonly router = inject(Router);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;

  readonly pasoActual = signal<1 | 2 | 3>(1);
  readonly metodoPago = signal<MetodoPago>('tarjeta');
  readonly numeroPedido = signal<string | null>(null);

  readonly envioForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    direccion: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[\d\s+()-]{7,15}$/)]]
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
  }

  subtotalLinea(item: ItemCarrito): number {
    return item.producto.precio * item.cantidad;
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
      .subscribe(pedido => {
        this.numeroPedido.set(pedido.numeroPedido);
        this.cartService.vaciarCarrito();
      });
  }

  private generarNumeroPedido(): string {
    return `PED-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
