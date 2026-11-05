import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, leerSesionDeValor } from "@/lib/sesion-cookie";
import { puedeEntrar, rutaInicioPorRol, RUTAS_PROTEGIDAS } from "@/lib/roles";

// Reemplaza el "if (!usuarioActivo) window.location.href = 'index.html'" que
// tenía cada página: ahora el control se hace en el servidor ANTES de mostrar
// la página, así que nunca se llega a ver un panel sin permiso.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = leerSesionDeValor(request.cookies.get(COOKIE_SESION)?.value);

  // Ya logueado y entra al login: lo mandamos directo a su panel.
  if (pathname === "/") {
    if (sesion) {
      return NextResponse.redirect(new URL(rutaInicioPorRol(sesion.rol), request.url));
    }
    return NextResponse.next();
  }

  const esProtegida = RUTAS_PROTEGIDAS.some((ruta) => pathname.startsWith(ruta));
  if (!esProtegida) return NextResponse.next();

  if (!sesion) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!puedeEntrar(sesion.rol, pathname)) {
    return NextResponse.redirect(new URL(rutaInicioPorRol(sesion.rol), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
