"use client";

import { useEffect, useState } from "react";
import { Loader2, PackagePlus, Sparkles } from "lucide-react";
import { recomendarReposicion, type Recomendacion } from "@/app/acciones/reposicion";
import { semanasHistorial } from "@/app/acciones/planilla";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { MARGEN_REPOSICION } from "@/lib/reposicion";

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 } as const;
const ESTADO_BARRA = {
  cerrada: { texto: "Cerrada", variante: "exito" },
  "sin-final": { texto: "Falta el Final", variante: "aviso" },
  "sin-conteo": { texto: "Sin conteo", variante: "apagado" },
} as const;

// "Qué reforzar": junta el conteo de todas las barras de la semana y sugiere
// qué reponer (Jefe de Barra y Supervisor).
export function Reposicion() {
  const [semanas, setSemanas] = useState<string[] | null>(null);
  const [semana, setSemana] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Recomendacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    semanasHistorial().then((r) => {
      if (r.ok) {
        setSemanas(r.datos);
        setSemana(r.datos[0] ?? "");
      } else {
        setError(r.error);
      }
    });
  }, []);

  async function generar() {
    setCargando(true);
    setError(null);
    const r = await recomendarReposicion(semana);
    setCargando(false);
    if (r.ok) setResultado(r.datos);
    else setError(r.error);
  }

  const lineas = resultado
    ? resultado.calculo.lineas
        .filter((l) => l.reponer > 0)
        .map((l) => ({ ...l, explicacion: resultado.ia?.items.find((i) => i.producto === l.producto) }))
        .sort(
          (a, b) =>
            ORDEN_PRIORIDAD[a.explicacion?.prioridad ?? "baja"] - ORDEN_PRIORIDAD[b.explicacion?.prioridad ?? "baja"] ||
            b.reponer - a.reponer
        )
    : [];
  const faltan = resultado
    ? Object.entries(resultado.calculo.barras).filter(([, e]) => e === "sin-final").map(([b]) => b)
    : [];

  return (
    <Seccion
      titulo="Qué reforzar"
      icono={PackagePlus}
      tono="oro"
      descripcion="Suma lo que quedó en todas las barras y lo compara con lo que se consume normalmente."
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <NativeSelect value={semana} onChange={(e) => setSemana(e.target.value)} disabled={!semanas?.length} aria-label="Semana">
          {semanas === null && !error && <option value="">Cargando semanas...</option>}
          {semanas?.length === 0 && <option value="">No hay stock cargado todavía</option>}
          {semanas?.map((s) => (
            <option key={s} value={s}>
              Semana del {s}
            </option>
          ))}
        </NativeSelect>
        <Button onClick={generar} disabled={cargando || !semana}>
          {cargando ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {cargando ? "Analizando..." : "Ver recomendación"}
        </Button>
      </div>

      {error && <TextoVacio error>{error}</TextoVacio>}

      {resultado && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(resultado.calculo.barras).map(([barra, estado]) => (
              <Badge key={barra} variant={ESTADO_BARRA[estado].variante}>
                {barra}: {ESTADO_BARRA[estado].texto}
              </Badge>
            ))}
          </div>
          {faltan.length > 0 && (
            <p className="text-xs font-semibold text-amber-700 dark:text-primary">
              Todavía no cerró: {faltan.join(", ")}. Cuando manden el Final, la recomendación puede cambiar.
            </p>
          )}

          {resultado.ia?.resumen && (
            <p className="bg-primary/10 border-primary/30 flex gap-2 rounded-lg border p-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-primary" />
              {resultado.ia.resumen}
            </p>
          )}
          {resultado.avisoIA && <p className="text-muted-foreground text-xs">{resultado.avisoIA}</p>}

          {lineas.length === 0 ? (
            <TextoVacio>Con lo que quedó alcanza para una semana normal: no hace falta reforzar nada.</TextoVacio>
          ) : (
            <div className="grid gap-2">
              {lineas.map((l) => (
                <div key={l.producto} className="bg-muted/30 flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {l.producto}
                      {l.explicacion && (
                        <Badge
                          variant={l.explicacion.prioridad === "alta" ? "destructive" : l.explicacion.prioridad === "media" ? "aviso" : "apagado"}
                        >
                          {l.explicacion.prioridad === "alta" ? "Urgente" : l.explicacion.prioridad === "media" ? "Conviene" : "Preventivo"}
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {l.explicacion?.motivo ??
                        `Quedaron ${l.quedo}; se usan ~${l.consumoHabitual ?? l.consumoSemana} por semana.`}
                    </p>
                  </div>
                  <Badge variant="barra" className="shrink-0 px-3 py-1 text-sm">
                    +{l.reponer}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Cálculo: consumo esperado (el mayor entre el habitual de las últimas {resultado.calculo.semanasComparadas || "—"}{" "}
            semanas y el de esta semana) con un {Math.round((MARGEN_REPOSICION - 1) * 100)}% de margen, menos lo que quedó.
          </p>
        </div>
      )}
    </Seccion>
  );
}
