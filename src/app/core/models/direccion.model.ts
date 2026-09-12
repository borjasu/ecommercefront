// Forma real de /direcciones (ver entities/direccion.entity.ts y
// CrearDireccionDto de ecommerceback) — antes este modelo tenía `direccion`/
// `ciudad` como texto libre, un formato distinto al que el backend en
// realidad exige desde la migración DireccionEstructurada; con
// ValidationPipe({ forbidNonWhitelisted: true }) eso hacía que crear o editar
// cualquier dirección (checkout y la página de cuenta) fallara con 400.
export interface Direccion {
  id: string;
  alias: string;
  nombreCompleto: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  // Estado/municipio/colonia: siempre los que devolvió GET /codigos-postales/:cp
  // para ese CP (autocompletados, ver CodigosPostalesService), o los que el
  // comprador tecleó a mano si el catálogo no cubre ese CP.
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  referencias: string | null;
  telefono: string;
  predeterminada: boolean;
}
