import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { AuthService } from '../../core/services/auth.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { EnvioEstimadoService } from '../../core/services/envio-estimado.service';
import { ItemCarrito } from '../../core/models/carrito.model';
import { Color } from '../../core/models/producto.model';
import { ItemParaCotizar } from '../../core/models/envio.model';
import { ColoresService } from '../../core/services/colores.service';
import { OpcionEnvioCardComponent } from '../../shared/components/opcion-envio-card/opcion-envio-card.component';

@Component({
    selector: 'app-carrito',
    imports: [RouterLink, OpcionEnvioCardComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './carrito.component.html'
})
export class CarritoComponent {
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly coloresService = inject(ColoresService);
  private readonly authService = inject(AuthService);
  private readonly direccionesService = inject(DireccionesService);
  readonly envioEstimadoService = inject(EnvioEstimadoService);

  readonly items = this.cartService.itemsCarrito;
  readonly total = this.cartService.total;
  readonly totalArticulos = this.cartService.cantidadItems;

  readonly totalConEnvioEstimado = computed(() => {
    const envio = this.envioEstimadoService.estimado();
    return envio ? Math.round((this.total() + envio.opcion.costo) * 100) / 100 : null;
  });

  // Por qué no se muestra el estimado (para el texto informativo): sin
  // sesión, o con sesión pero sin dirección predeterminada guardada.
  readonly puedeEstimarEnvio = computed(
    () => !!this.authService.currentUser() && this.direccionesService.listado().some(direccion => direccion.predeterminada)
  );

  constructor() {
    // El estimado se resuelve de forma asíncrona en un servicio aparte (con su
    // propio cache/debounce, ver EnvioEstimadoService) — nunca bloquea este
    // render: el carrito (subtotal, productos) se ve de inmediato pase lo que
    // pase con la cotización.
    effect(() => {
      const items = this.items();
      const usuario = this.authService.currentUser();
      const predeterminada = this.direccionesService.listado().find(direccion => direccion.predeterminada);

      if (!usuario || !predeterminada || items.length === 0) {
        this.envioEstimadoService.limpiar();
        return;
      }

      this.envioEstimadoService.solicitar(
        predeterminada.id,
        predeterminada.ciudad,
        this.itemsParaCotizar(),
        this.totalArticulos()
      );
    });
  }

  subtotal(item: ItemCarrito): number {
    return (item.producto.precioFinal ?? item.producto.precio) * item.cantidad;
  }

  incrementar(item: ItemCarrito): void {
    this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad + 1, item.color);
  }

  async decrementar(item: ItemCarrito): Promise<void> {
    if (item.cantidad - 1 <= 0) {
      const confirmado = await this.confirmService.confirmar({
        titulo: 'Quitar de la bolsa',
        mensaje: `¿Quitar "${item.producto.nombre}" de la bolsa?`,
        textoConfirmar: 'Quitar',
        peligroso: true
      });

      if (!confirmado) {
        return;
      }

      this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad - 1, item.color);
      this.toastService.exito(`"${item.producto.nombre}" se quitó de tu bolsa.`);
      return;
    }

    this.cartService.actualizarCantidad(item.producto.id, item.talla, item.cantidad - 1, item.color);
  }

  async eliminar(item: ItemCarrito): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Quitar de la bolsa',
      mensaje: `¿Quitar "${item.producto.nombre}" de la bolsa?`,
      textoConfirmar: 'Quitar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.cartService.eliminarItem(item.producto, item.talla, item.color);
    this.toastService.exito(`"${item.producto.nombre}" se quitó de tu bolsa.`);
  }

  etiquetaDeColor(color: Color): string {
    return this.coloresService.etiquetaDe(color);
  }

  hexDeColor(color: Color): string {
    return this.coloresService.hexDe(color);
  }

  private itemsParaCotizar(): ItemParaCotizar[] {
    return this.items().map(item => ({
      productoId: item.producto.id,
      talla: item.talla,
      color: item.color ?? '',
      cantidad: item.cantidad
    }));
  }
}
