"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  UserPlus,
  Wand2,
} from "lucide-react";
import { EsqueletoLista } from "@/components/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  convocarEquipo,
  sugerirEquipoIA,
  type SugerenciaEquipo,
} from "@/app/acciones/convocatoria";
import { usePanel } from "@/components/panel/convocatoria";
import { Seccion } from "@/components/panel/seccion";
import { SelectorDia } from "@/components/panel/selector-dia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Fila = {
  userName: string;
  nombre: string;
  turnos: number;
  sector: string;
  motivo: string;
  marcado: boolean;
};

// "Armar equipo con IA": el encargado escribe qué necesita ("necesito 4, 2 en
// Vip y 2 en Principal"), la IA propone a quién convocar repartiendo parejo,
// y nada se guarda hasta que el encargado revisa y aprieta "Convocar".
export function ArmarEquipo({
  puesto,
  sectores,
  iaDisponible,
}: {
  puesto: "mozos" | "bartenders";
  sectores: readonly string[];
  iaDisponible: boolean;
}) {
  const { dia, setDia } = usePanel();
  const [pedido, setPedido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sugerencia, setSugerencia] = useState<SugerenciaEquipo | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [diaSugerencia, setDiaSugerencia] = useState(dia);
  const [convocando, iniciarConvocar] = useTransition();

  const ejemplo =
    puesto === "mozos"
      ? "Ej: necesito 4, dos en Vip y dos en Principal, y uno en Cocina"
      : "Ej: necesito 3, uno en Vip, uno en Cantina y uno en Patio";

  async function sugerir() {
    setCargando(true);
    const r = await sugerirEquipoIA(dia, puesto, pedido);
    setCargando(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setSugerencia(r.datos);
    setDiaSugerencia(dia);
    setFilas([
      ...r.datos.elegidos.map((e) => ({ ...e, marcado: true })),
      ...r.datos.noElegidos.map((n) => ({
        ...n,
        sector: "Principal",
        motivo: "",
        marcado: false,
      })),
    ]);
  }

  function cambiar(userName: string, cambio: Partial<Fila>) {
    setFilas((f) =>
      f.map((x) => (x.userName === userName ? { ...x, ...cambio } : x)),
    );
  }

  const marcados = filas.filter((f) => f.marcado);

  function convocar() {
    iniciarConvocar(async () => {
      const r = await convocarEquipo(
        diaSugerencia,
        puesto,
        marcados.map((m) => ({ userName: m.userName, sector: m.sector })),
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `Convocaste a ${r.datos.cantidad} para el ${diaSugerencia}`,
      );
      setSugerencia(null);
      setFilas([]);
      setPedido("");
    });
  }

  return (
    <Seccion
      titulo="Armar equipo con IA"
      icono={Sparkles}
      tono="oro"
      descripcion="Decí cuántos necesitás y dónde: te propongo a quién convocar repartiendo los turnos parejo. Vos confirmás."
      acciones={<SelectorDia valor={dia} onCambiar={setDia} />}
    >
      {!iaDisponible ? (
        <p className="text-muted-foreground text-sm">
          La IA todavía no está configurada.
        </p>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Textarea
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder={ejemplo}
              rows={2}
              maxLength={1000}
            />
            <Button
              onClick={sugerir}
              disabled={cargando || !pedido.trim()}
              className="justify-self-start"
            >
              {cargando ? <Loader2 className="animate-spin" /> : <Wand2 />}
              Sugerir equipo para el {dia}
            </Button>
          </div>

          {cargando && (
            <div className="grid gap-3">
              <Skeleton className="h-4 w-4/5" />
              <EsqueletoLista items={4} />
            </div>
          )}

          {sugerencia && !cargando && (
            <div className="grid gap-3">
              {diaSugerencia !== dia && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Esta sugerencia es para el {diaSugerencia}. Volvé a sugerir si
                  querés otro día.
                </p>
              )}
              {sugerencia.resumen && (
                <p className="text-sm font-medium">{sugerencia.resumen}</p>
              )}
              {sugerencia.avisos.map((a) => (
                <p
                  key={a}
                  className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {a}
                </p>
              ))}

              <ul className="divide-border grid divide-y rounded-md border">
                {filas.map((f) => (
                  <li
                    key={f.userName}
                    className="flex flex-wrap items-center gap-3 p-3"
                  >
                    <label className="flex min-w-0 basis-full items-center gap-3 sm:basis-0 sm:flex-1">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={f.marcado}
                        onChange={(e) =>
                          cambiar(f.userName, { marcado: e.target.checked })
                        }
                      />
                      <span className="grid min-w-0">
                        <span className="font-medium">{f.nombre}</span>
                        <span className="text-muted-foreground text-xs">
                          {f.motivo ||
                            `${f.turnos} ${f.turnos === 1 ? "turno" : "turnos"} en las últimas 4 semanas`}
                        </span>
                      </span>
                    </label>
                    <Badge variant="secondary" className="ml-7 sm:ml-0">
                      {f.turnos} {f.turnos === 1 ? "turno" : "turnos"}
                    </Badge>
                    <div className="w-40 flex-1 sm:flex-none">
                      <NativeSelect
                        aria-label={`Sector de ${f.nombre}`}
                        value={f.sector}
                        disabled={!f.marcado}
                        onChange={(e) =>
                          cambiar(f.userName, { sector: e.target.value })
                        }
                      >
                        {sectores.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={convocar}
                  disabled={convocando || marcados.length === 0}
                >
                  {convocando ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <UserPlus />
                  )}
                  Convocar {marcados.length} para el {diaSugerencia}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSugerencia(null);
                    setFilas([]);
                  }}
                >
                  Descartar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Seccion>
  );
}
