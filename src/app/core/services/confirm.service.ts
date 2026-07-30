import { Injectable, signal } from '@angular/core';

export interface ConfirmOpciones {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
}

interface SolicitudConfirm extends ConfirmOpciones {
  resolver: (valor: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private readonly _solicitud = signal<SolicitudConfirm | null>(null);

  readonly solicitud = this._solicitud.asReadonly();

  confirmar(opciones: ConfirmOpciones): Promise<boolean> {
    return new Promise(resolver => {
      this._solicitud.set({ ...opciones, resolver });
    });
  }

  responder(valor: boolean): void {
    this._solicitud()?.resolver(valor);
    this._solicitud.set(null);
  }
}
