import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'exito' | 'error' | 'info';

export interface ToastMensaje {
  id: string;
  tipo: ToastTipo;
  texto: string;
}

const DURACION_MS = 3000;

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _mensajes = signal<ToastMensaje[]>([]);

  readonly mensajes = this._mensajes.asReadonly();

  mostrar(texto: string, tipo: ToastTipo = 'info'): void {
    const id = crypto.randomUUID();
    this._mensajes.update(actuales => [...actuales, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), DURACION_MS);
  }

  exito(texto: string): void {
    this.mostrar(texto, 'exito');
  }

  error(texto: string): void {
    this.mostrar(texto, 'error');
  }

  cerrar(id: string): void {
    this._mensajes.update(actuales => actuales.filter(mensaje => mensaje.id !== id));
  }
}
