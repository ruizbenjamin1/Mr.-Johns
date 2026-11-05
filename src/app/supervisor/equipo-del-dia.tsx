"use client";

import { useState } from "react";
import { BadgeCheck, Martini, Users } from "lucide-react";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { SelectorDia } from "@/components/panel/selector-dia";
import { Badge } from "@/components/ui/badge";
import { esConvocadoDelDia } from "@/lib/turno";
import type { Convocado, Usuario } from "@/lib/tipos";

// Equipo convocado (solo lectura). Arranca en el día de hoy: convocar,
// sacar o reasignar sigue siendo tarea de Admin / Jefe de Barra.
export function EquipoDelDia({
  usuarios,
  convocados,
  diaHoy,
  textoHoy,
}: {
  usuarios: Usuario[];
  convocados: Convocado[];
  diaHoy: string;
  textoHoy: string;
}) {
  const [dia, setDia] = useState(diaHoy);
  const delDia = convocados
    .filter((c) => esConvocadoDelDia(c.dia, dia))
    .map((c) => ({ convocado: c, usuario: usuarios.find((u) => u.user_name === c.user_name) }));

  const lista = (rol: string) => {
    const filas = delDia.filter((f) => f.usuario?.rol === rol);
    if (filas.length === 0) return <TextoVacio>Nadie convocado para el {dia}.</TextoVacio>;
    return filas.map((f) => (
      <div key={f.convocado.user_name} className="bg-muted/30 flex items-center justify-between rounded-lg border p-3">
        <span className="font-bold">{f.usuario!.nombre_real || f.usuario!.user_name}</span>
        <Badge variant="exito">{f.convocado.sector || "Principal"}</Badge>
      </div>
    ));
  };

  return (
    <Seccion
      titulo="Equipo Convocado"
      icono={Users}
      descripcion={<span className="font-semibold text-amber-700 dark:text-primary">{textoHoy}</span>}
      acciones={<SelectorDia valor={dia} onCambiar={setDia} />}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-amber-700 uppercase dark:text-primary">
            <BadgeCheck className="size-4" />
            Mozos
          </h3>
          {lista("mozo")}
        </div>
        <div className="grid content-start gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-cyan-700 uppercase dark:text-barra">
            <Martini className="size-4" />
            Bartenders
          </h3>
          {lista("bartender")}
        </div>
      </div>
    </Seccion>
  );
}
