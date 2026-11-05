import { LogOut } from "lucide-react";
import Image from "next/image";
import { cerrarSesion } from "@/app/acciones-sesion";
import { BotonTema } from "@/components/boton-tema";
import { Button } from "@/components/ui/button";
import { obtenerSesion } from "@/lib/sesion";

// Barra superior común a todos los paneles: logo, quién está logueado,
// cambio de tema y cerrar sesión (antes repetido en cada HTML).
export async function EncabezadoPanel({ titulo, detalle }: { titulo: string; detalle?: string }) {
  const sesion = await obtenerSesion();

  return (
    <header className="bg-card/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Image src="/logo.png" alt="Mr. John's" width={40} height={40} className="logo-tema rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{titulo}</p>
          <p className="text-muted-foreground truncate text-xs">{detalle ?? sesion?.nombre}</p>
        </div>
        <BotonTema />
        <form action={cerrarSesion}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </form>
      </div>
    </header>
  );
}

/** Placeholder del encabezado mientras carga (mismo alto, sin saltos). */
export function EncabezadoCargando() {
  return <div className="bg-card/80 h-16 border-b" />;
}
