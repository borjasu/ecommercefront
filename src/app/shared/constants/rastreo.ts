// Etiquetas legibles para EstadoRastreo (texto libre que manda Skydropx —
// ver core/models/pedido.model.ts). Un valor que no esté en este mapa
// (paquetería nueva, estado no anticipado) simplemente no se traduce: se
// muestra tal cual en vez de romper la vista.
const ETIQUETAS_RASTREO: Record<string, string> = {
  created: 'Creado',
  picked_up: 'Recolectado',
  in_transit: 'En tránsito',
  last_mile: 'Última milla',
  delivery_attempt: 'Intento de entrega',
  delivered_to_branch: 'Entregado en sucursal',
  delivered: 'Entregado',
  exception: 'Incidencia',
  in_return: 'En devolución',
  canceled: 'Cancelado',
  destroyed: 'Destruido',
  retained: 'Retenido'
};

export function etiquetaDeRastreo(estado: string | null | undefined): string | null {
  if (!estado) {
    return null;
  }
  return ETIQUETAS_RASTREO[estado] ?? estado;
}
