import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Esqueletos de carga: tienen la misma forma que lo que va a aparecer, así
// la pantalla no "salta" cuando llegan los datos.

/** Barra superior mientras carga (logo, título y botones). */
export function EsqueletoEncabezado() {
  return (
    <header className="bg-card/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Skeleton className="size-10" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="size-9" />
        <Skeleton className="h-9 w-20" />
      </div>
    </header>
  );
}

/** Filas de una tabla. */
export function EsqueletoTabla({ filas = 5, columnas = 3, className }: { filas?: number; columnas?: number; className?: string }) {
  return (
    <div className={cn("grid gap-0 overflow-hidden rounded-md border", className)} role="status" aria-label="Cargando">
      {Array.from({ length: filas + 1 }, (_, f) => (
        <div key={f} className={cn("flex items-center gap-4 border-b px-3 py-3 last:border-b-0", f === 0 && "bg-muted/30")}>
          {Array.from({ length: columnas }, (_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "flex-[2]" : "flex-1", f === 0 && "h-3 opacity-70")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Lista de tarjetitas (nombre + detalle a la izquierda, algo a la derecha). */
export function EsqueletoLista({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)} role="status" aria-label="Cargando">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Una tarjeta de panel (título con ícono y el contenido que le pases). */
export function EsqueletoSeccion({ children, conAcciones = false }: { children?: React.ReactNode; conAcciones?: boolean }) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-5 w-44" />
        </div>
        {conAcciones && <Skeleton className="h-9 w-32" />}
      </CardHeader>
      <CardContent>{children ?? <EsqueletoLista />}</CardContent>
    </Card>
  );
}

/** Campos de un formulario + botón. */
export function EsqueletoFormulario({ campos = 3 }: { campos?: number }) {
  return (
    <div className="grid gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: campos }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** Contenedor con el mismo ancho y márgenes que los paneles. */
export function EsqueletoPanel({ children, ancho = "max-w-5xl" }: { children: React.ReactNode; ancho?: string }) {
  return <main className={cn("mx-auto grid w-full flex-1 gap-6 px-4 py-6 pb-24", ancho)}>{children}</main>;
}

// === Un esqueleto por panel ===

/** Administración y Jefe de Barra: grilla semanal, armar equipo, convocados y disponibles, alta. */
export function EsqueletoPanelConvocatoria({ extra = 0 }: { extra?: number }) {
  return (
    <EsqueletoPanel>
      <EsqueletoSeccion>
        <EsqueletoTabla filas={6} columnas={8} />
      </EsqueletoSeccion>
      <EsqueletoSeccion conAcciones>
        <Skeleton className="mb-3 h-16 w-full" />
        <Skeleton className="h-9 w-56" />
      </EsqueletoSeccion>
      <EsqueletoSeccion conAcciones>
        <EsqueletoLista items={3} />
      </EsqueletoSeccion>
      <EsqueletoSeccion>
        <EsqueletoLista items={4} />
      </EsqueletoSeccion>
      <EsqueletoSeccion>
        <EsqueletoFormulario campos={4} />
      </EsqueletoSeccion>
      {Array.from({ length: extra }, (_, i) => (
        <EsqueletoSeccion key={i} />
      ))}
    </EsqueletoPanel>
  );
}

/** Supervisor: equipo del día, propinas e historial. */
export function EsqueletoPanelSupervisor() {
  return (
    <EsqueletoPanel>
      <EsqueletoSeccion>
        <EsqueletoTabla filas={5} columnas={3} />
      </EsqueletoSeccion>
      <EsqueletoSeccion>
        <EsqueletoLista items={3} />
      </EsqueletoSeccion>
      <EsqueletoSeccion conAcciones>
        <EsqueletoLista items={3} />
      </EsqueletoSeccion>
      <EsqueletoSeccion>
        <EsqueletoFormulario campos={2} />
      </EsqueletoSeccion>
    </EsqueletoPanel>
  );
}

/** Panel del personal: encabezado, disponibilidad y la carta. */
export function EsqueletoPanelPersonal() {
  return (
    <>
      <EsqueletoEncabezado />
      <EsqueletoPanel ancho="max-w-4xl">
        <EsqueletoSeccion>
          <EsqueletoTabla filas={7} columnas={3} />
          <Skeleton className="mt-3 h-9 w-full" />
          <Skeleton className="mt-3 h-11 w-full" />
        </EsqueletoSeccion>
        <div className="grid gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <EsqueletoLista items={4} />
        </div>
      </EsqueletoPanel>
    </>
  );
}
