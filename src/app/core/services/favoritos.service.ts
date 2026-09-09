import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { AuthService } from './auth.service';

interface FavoritoApi {
  producto: { id: string };
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly ids = signal<Set<string>>(new Set());

  readonly cantidad = computed(() => this.ids().size);

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();
      if (usuario) {
        this.cargar();
      } else {
        this.ids.set(new Set());
      }
    });
  }

  esFavorito(productoId: string): boolean {
    return this.ids().has(productoId);
  }

  alternar(productoId: string): void {
    const eraFavorito = this.ids().has(productoId);

    // Optimista: la UI (el corazón) cambia de inmediato, igual que antes con
    // localStorage; si el backend rechaza la petición, se revierte.
    this.ids.update(actuales => {
      const nuevo = new Set(actuales);
      if (eraFavorito) {
        nuevo.delete(productoId);
      } else {
        nuevo.add(productoId);
      }
      return nuevo;
    });

    const peticion = eraFavorito
      ? this.http.delete<void>(`${API_URL}/favoritos/${productoId}`)
      : this.http.post<void>(`${API_URL}/favoritos/${productoId}`, {});

    peticion.subscribe({
      error: () => {
        this.ids.update(actuales => {
          const revertido = new Set(actuales);
          if (eraFavorito) {
            revertido.add(productoId);
          } else {
            revertido.delete(productoId);
          }
          return revertido;
        });
      }
    });
  }

  private cargar(): void {
    this.http
      .get<FavoritoApi[]>(`${API_URL}/favoritos`)
      .subscribe(favoritos => this.ids.set(new Set(favoritos.map(favorito => favorito.producto.id))));
  }
}
