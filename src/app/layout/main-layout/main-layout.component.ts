import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {}
