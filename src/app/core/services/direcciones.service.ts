import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Direccion } from '../models/direccion.model';

@Injectable({
  providedIn: 'root'
})
export class DireccionesService {
  private readonly authService = inject(AuthService);

  private readonly direcciones = signal<Direccion[]>([]);

  readonly listado = this.direcciones.asReadonly();

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();
      this.direcciones.set(usuario ? this.leerGuardadas(usuario.id) : []);
    });

    effect(() => {
      const usuario = this.authService.currentUser();
      if (usuario) {
        localStorage.setItem(this.clave(usuario.id), JSON.stringify(this.direcciones()));
      }
    });
  }

  agregar(datos: Omit<Direccion, 'id'>): void {
    const nueva: Direccion = { ...datos, id: crypto.randomUUID() };
    this.direcciones.update(actuales => {
      const base = nueva.predeterminada ? actuales.map(d => ({ ...d, predeterminada: false })) : actuales;
      return [...base, nueva];
    });
  }

  actualizar(id: string, cambios: Partial<Omit<Direccion, 'id'>>): void {
    this.direcciones.update(actuales => {
      const base = cambios.predeterminada ? actuales.map(d => ({ ...d, predeterminada: false })) : actuales;
      return base.map(direccion => (direccion.id === id ? { ...direccion, ...cambios } : direccion));
    });
  }

  eliminar(id: string): void {
    this.direcciones.update(actuales => actuales.filter(direccion => direccion.id !== id));
  }

  marcarPredeterminada(id: string): void {
    this.direcciones.update(actuales =>
      actuales.map(direccion => ({ ...direccion, predeterminada: direccion.id === id }))
    );
  }

  private clave(usuarioId: string): string {
    return `direcciones_${usuarioId}`;
  }

  private leerGuardadas(usuarioId: string): Direccion[] {
    const guardado = localStorage.getItem(this.clave(usuarioId));

    if (!guardado) {
      return [];
    }

    try {
      const direcciones = JSON.parse(guardado);
      return Array.isArray(direcciones) ? direcciones : [];
    } catch {
      return [];
    }
  }
}
