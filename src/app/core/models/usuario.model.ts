export type RolUsuario = 'comprador' | 'vendedor';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}
