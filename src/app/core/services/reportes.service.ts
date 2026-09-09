import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PedidoResumen } from '../models/pedido.model';

export interface ResumenDashboard {
  totalProductos: number;
  totalPedidos: number;
  pedidosPendientes: number;
  ingresosTotales: number;
  pedidosRecientes: PedidoResumen[];
}

export interface PuntoVenta {
  etiqueta: string;
  total: number;
}

export interface ProductoMasVendido {
  productoId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface ResumenReportes {
  ingresosTotales: number;
  totalPedidos: number;
  ticketPromedio: number;
  serieVentas: PuntoVenta[];
  productosMasVendidos: ProductoMasVendido[];
}

export interface FiltrosReportes {
  desde?: string;
  hasta?: string;
  granularidad?: 'dia' | 'semana' | 'mes';
}

// GET /vendedor/dashboard y GET /vendedor/reportes ya calculan todo con SQL
// real del lado del backend (ver ReportsService de ecommerceback: ingresos,
// ticket promedio, serie de ventas agrupada por período, productos más
// vendidos) — a diferencia del mock anterior, el frontend ya NO deriva estas
// métricas de la lista completa de pedidos, solo pinta lo que regresa la API.
@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vendedor`;

  dashboard(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${this.baseUrl}/dashboard`, { withCredentials: true });
  }

  reportes(filtros: FiltrosReportes): Observable<ResumenReportes> {
    const params: Record<string, string> = {};
    if (filtros.desde) {
      params['desde'] = filtros.desde;
    }
    if (filtros.hasta) {
      params['hasta'] = filtros.hasta;
    }
    if (filtros.granularidad) {
      params['granularidad'] = filtros.granularidad;
    }

    return this.http.get<ResumenReportes>(`${this.baseUrl}/reportes`, { params, withCredentials: true });
  }
}
