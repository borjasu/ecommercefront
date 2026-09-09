import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Tarjeta de opción de envío — misma pieza visual para el estimado de
 * /carrito (modo informativo, sin click) y para "Opciones de entrega" del
 * checkout (modo seleccionable, con click + indicador de check).
 */
@Component({
    selector: 'app-opcion-envio-card',
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './opcion-envio-card.component.html'
})
export class OpcionEnvioCardComponent {
  readonly paqueteria = input.required<string>();
  readonly servicio = input<string | null>(null);
  readonly tiempoEstimado = input.required<string>();
  readonly costo = input.required<number>();
  readonly seleccionable = input(false);
  readonly seleccionado = input(false);
  readonly etiquetaSuperior = input<string | null>(null);

  readonly elegir = output<void>();

  onClick(): void {
    if (this.seleccionable()) {
      this.elegir.emit();
    }
  }
}
