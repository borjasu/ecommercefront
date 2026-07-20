import { Component } from '@angular/core';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [BreadcrumbComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  // Se conectará con la categoría/producto real de la ruta en la Fase 5.
  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', url: '/catalogo' },
    { label: 'Catálogo' }
  ];
}
