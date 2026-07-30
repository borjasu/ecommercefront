import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { AgregarCarritoModalComponent } from '../../shared/components/agregar-carrito-modal/agregar-carrito-modal.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
    selector: 'app-main-layout',
    imports: [
        RouterOutlet,
        HeaderComponent,
        FooterComponent,
        AgregarCarritoModalComponent,
        ToastContainerComponent,
        ConfirmModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {}
