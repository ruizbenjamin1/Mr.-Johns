import { Suspense } from "react";
import { EncabezadoPanel } from "@/components/encabezado-panel";

// Panel de Jefe de Barra (antes legacy/jefe_barra.html). Migración pendiente: por ahora solo el esqueleto.
export default function PaginaJefeBarra() {
  return (
    <>
      <Suspense fallback={<div className="bg-card/80 h-16 border-b" />}>
        <EncabezadoPanel titulo="Panel de Jefe de Barra" />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-muted-foreground text-sm">Este panel todavía se está migrando.</p>
      </main>
    </>
  );
}
