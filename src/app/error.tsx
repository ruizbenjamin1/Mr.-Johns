"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Se muestra si una página no pudo cargar (por ejemplo, Supabase no respondió).
export default function ErrorDePagina({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <AlertTriangle className="text-primary size-10" />
      <div className="grid gap-1">
        <h1 className="text-lg font-bold">No se pudieron cargar los datos del panel</h1>
        <p className="text-muted-foreground text-sm">Revisá la conexión y probá de nuevo.</p>
      </div>
      <Button onClick={() => retry()}>
        <RotateCw />
        Reintentar
      </Button>
    </main>
  );
}
