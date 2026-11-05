import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESION, leerSesionDeValor, type Sesion } from "./sesion-cookie";

// La sesión ahora vive en una cookie httpOnly en vez de sessionStorage:
// el JavaScript del navegador ya no puede leer ni robar el token.
// El servidor lo sigue validando en cada RPC, igual que antes.

export type { Sesion };

export async function obtenerSesion(): Promise<Sesion | null> {
  const almacen = await cookies();
  return leerSesionDeValor(almacen.get(COOKIE_SESION)?.value);
}

export async function guardarSesion(sesion: Sesion) {
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, JSON.stringify(sesion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sin maxAge: se borra al cerrar el navegador, como el sessionStorage de antes.
  });
}

export async function borrarSesion() {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
}
