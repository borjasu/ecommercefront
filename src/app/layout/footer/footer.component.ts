import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-footer',
    imports: [RouterLink],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly anio = new Date().getFullYear();

  readonly redesSociales = ['Instagram', 'Facebook', 'TikTok'];
}
