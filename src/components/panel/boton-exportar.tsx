"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Resultado } from "@/lib/tipos";

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos, para evitar filas duplicadas por doble click

/**
 * Botón "Exportar" a la planilla. Ahora el servidor confirma si la planilla
 * recibió el envío: si falla, el aviso tiene un botón para reintentar con
 * los mismos datos (antes había que usar el respaldo en localStorage).
 */
export function BotonExportar({
  exportar,
  onExito,
  className,
}: {
  exportar: () => Promise<Resultado<{ cantidad: number }>>;
  onExito?: () => void;
  className?: string;
}) {
  const [enviando, setEnviando] = useState(false);
  const [finCooldown, setFinCooldown] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!finCooldown) return;
    const intervalo = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= finCooldown) setFinCooldown(null);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [finCooldown]);

  async function ejecutar() {
    setEnviando(true);
    const resultado = await exportar();
    setEnviando(false);
    if (resultado.ok) {
      toast.success(`Planilla actualizada: ${resultado.datos.cantidad} filas enviadas.`);
      setAhora(Date.now());
      setFinCooldown(Date.now() + COOLDOWN_MS);
      onExito?.();
    } else {
      toast.error(resultado.error, { action: { label: "Reintentar", onClick: ejecutar }, duration: 10000 });
    }
  }

  const restante = finCooldown ? Math.max(0, finCooldown - ahora) : 0;
  const minutos = Math.floor(restante / 60000);
  const segundos = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-2 py-2">
        <Button size="lg" onClick={ejecutar} disabled={enviando || restante > 0} className="px-8 font-bold">
          {enviando ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          {enviando ? "Enviando..." : "Exportar"}
        </Button>
        {restante > 0 && (
          <p className="text-muted-foreground text-center text-xs">
            Podés volver a exportar en {minutos}:{segundos} (para evitar filas duplicadas).
          </p>
        )}
      </div>
    </div>
  );
}
