"use client";

import { useEffect, useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { propinasPlanilla, type FilaPropina } from "@/app/acciones/planilla";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatearPesos } from "@/lib/numeros";

type Tipo = "barras" | "mozos";

// Propinas leídas de la planilla.
// "Barras": hasta el 4/11/2026 cada fila tenía el total de la barra y el Apps
// Script lo agrupa por barra; desde el 5/11 la propina se divide entre todos
// los bartenders y cada fila es lo que cobra esa persona (viene con nombre).
// "Mozos": cada fila es la propina individual de una persona.
export function Propinas() {
  const [tipo, setTipo] = useState<Tipo>("barras");
  const [filas, setFilas] = useState<FilaPropina[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    let vigente = true;
    propinasPlanilla(tipo).then((r) => {
      if (!vigente) return;
      if (r.ok) {
        setFilas(r.datos);
        setError(null);
      } else {
        setError(r.error);
      }
    });
    return () => {
      vigente = false;
    };
  }, [tipo]);

  function cambiarTipo(nuevo: string) {
    setTipo(nuevo as Tipo);
    setFilas(null);
    setError(null);
    setFecha("");
  }

  const fechas = filas ? [...new Set(filas.map((f) => f.fecha))].sort().reverse() : [];
  const visibles = filas ? (fecha ? filas.filter((f) => f.fecha === fecha) : filas) : [];

  return (
    <Seccion titulo="Propinas" icono={HandCoins}>
      <Tabs value={tipo} onValueChange={cambiarTipo} className="mb-3">
        <TabsList className="w-full">
          <TabsTrigger value="barras">Barras</TabsTrigger>
          <TabsTrigger value="mozos">Mozos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-3">
        <NativeSelect value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Filtrar por fecha" disabled={!filas}>
          <option value="">Todas las fechas</option>
          {fechas.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </NativeSelect>
      </div>

      {error ? (
        <TextoVacio error>{error}</TextoVacio>
      ) : filas === null ? (
        <p className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando...
        </p>
      ) : visibles.length === 0 ? (
        <TextoVacio>No hay propinas cargadas para esa búsqueda.</TextoVacio>
      ) : (
        <div className="grid gap-2">
          {visibles.map((f, i) => (
            <div key={`${f.fecha}-${f.barra}-${f.nombre}-${i}`} className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                {/* Con nombre: lo que cobra esa persona (mozos, y bartenders desde el 5/11/2026,
                    cuando la propina de barra empezó a dividirse entre todos). Sin nombre: total de la barra (días anteriores). */}
                <p className="font-bold">{f.nombre ? f.nombre : tipo === "mozos" ? "Sin nombre" : f.barra}</p>
                <p className="text-muted-foreground text-sm">{f.nombre ? `${f.barra || ""} · ${f.fecha}` : f.fecha}</p>
              </div>
              <Badge variant="exito" className="px-3 py-1.5 text-sm">
                ${formatearPesos(Number(f.monto || 0))}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );
}
