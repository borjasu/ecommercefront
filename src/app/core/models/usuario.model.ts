export type Rol = 'comprador' | 'vendedor';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono?: string | null;
  fechaRegistro?: string;
}
