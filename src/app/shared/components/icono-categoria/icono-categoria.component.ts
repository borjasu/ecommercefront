import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// El proyecto no usa ninguna librería de íconos (todo el resto de la app —
// editar/eliminar/favoritos/carrusel — es SVG inline a mano, mismo estilo:
// viewBox 24x24, stroke="currentColor", stroke-width 2). Este componente
// sigue esa misma convención para los íconos de categoría en vez de agregar
// una dependencia nueva solo para esto (ver ICONOS_CATEGORIA en
// shared/constants/iconos-categoria.ts para la lista cerrada de `nombre`
// válidos que puede recibir). Un `nombre` desconocido cae al ícono genérico
// de "accesorio" en vez de no dibujar nada.
@Component({
  selector: 'app-icono-categoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="true"
      class="h-full w-full"
    >
      @switch (nombre()) {
        @case ('pantalon') {
          <path d="M7 3h10l1 6-2 12h-2.5l-.8-9-.8 9H9L7 9 7 3Z" />
        }
        @case ('camisa') {
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3-2 3h-2L9 3Z" />
          <path d="M11 3v2l1 1 1-1V3" />
        }
        @case ('bermuda') {
          <path d="M6 3h12l1 6-1 8h-3l-.5-5-.5 5H9l-1-8 1-6Z" />
        }
        @case ('chamarra') {
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3-2 3h-2L9 3Z" />
          <line x1="12" y1="8" x2="12" y2="20" />
        }
        @case ('sudadera') {
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3-1 2h-2L9 3Z" />
          <path d="M10 3 12 1 14 3" />
        }
        @case ('calcetines') {
          <path d="M9 2h5v10l4 6a2 2 0 0 1-2 3H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        }
        @case ('gorra') {
          <path d="M4 15a8 8 0 0 1 16 0" />
          <path d="M2 15h20l-2 3H4l-2-3Z" />
        }
        @case ('cinturon') {
          <rect x="2" y="10" width="20" height="4" rx="1" />
          <rect x="10" y="8" width="4" height="8" rx="1" />
        }
        @case ('zapatos') {
          <path d="M3 18v-3l5-4 4 2h3l4-2 2 2v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        }
        @case ('ropa_interior') {
          <path d="M4 5h16l-1 6-3 9h-2l-2-6-2 6H8l-3-9L4 5Z" />
          <line x1="5.5" y1="8" x2="18.5" y2="8" />
        }
        @case ('traje_bano') {
          <path d="M4 5h16l-1 6-3 10h-2l-2-7-2 7H8l-3-10L4 5Z" />
          <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
        }
        @case ('pijama') {
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3-2 3h-2L9 3Z" />
          <circle cx="18.5" cy="4.5" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="20.5" cy="6.5" r="0.4" fill="currentColor" stroke="none" />
        }
        @case ('playera') {
          <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3-1 2h-2L9 3Z" />
        }
        @default {
          <path d="M6 8h12l1 12H5L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        }
      }
    </svg>
  `
})
export class IconoCategoriaComponent {
  readonly nombre = input<string>('accesorio');
}
