import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
    selector: 'app-breadcrumb',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './breadcrumb.component.html'
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
