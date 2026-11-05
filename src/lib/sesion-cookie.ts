// Formato de la cookie de sesión. Va separado de sesion.ts para que el proxy
// lo pueda usar sin importar next/headers.

export const COOKIE_SESION = "mj_sesion";

export type Sesion = {
  usuario: string;
  nombre: string;
  rol: string;
  token: string;
};

export function leerSesionDeValor(valor: string | undefined): Sesion | null {
  if (!valor) return null;
  try {
    const datos = JSON.parse(valor) as Partial<Sesion>;
    if (!datos.usuario || !datos.rol || !datos.token) return null;
    return {
      usuario: datos.usuario,
      nombre: datos.nombre || datos.usuario,
      rol: datos.rol,
      token: datos.token,
    };
  } catch {
    return null;
  }
}
