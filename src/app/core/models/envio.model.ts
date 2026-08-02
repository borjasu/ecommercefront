export interface OpcionEnvio {
  rateId: string;
  paqueteria: string;
  servicio: string;
  costo: number;
  tiempoEstimado: string;
}

export interface RespuestaCotizacion {
  cotizacionId: string;
  opciones: OpcionEnvio[];
}

export interface ItemParaCotizar {
  productoId: string;
  talla: string;
  color: string;
  cantidad: number;
}
