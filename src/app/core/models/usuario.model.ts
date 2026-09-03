export type Rol = 'comprador' | 'vendedor';

// Refleja PerfilUsuario del backend (ver ecommerceback:
// modules/users/perfil-usuario.mapper.ts) — ya no lleva `password`: la
// sesión real vive en una cookie HttpOnly que el navegador maneja solo, el
// hash nunca sale del servidor y el frontend no necesita guardar nada
// sensible en memoria.
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono?: string;
  fechaRegistro: string;
}
