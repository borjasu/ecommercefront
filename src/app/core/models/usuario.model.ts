export type Rol = 'comprador' | 'vendedor';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string; // solo para mock, en producción nunca se guarda así
  rol: Rol;
}
