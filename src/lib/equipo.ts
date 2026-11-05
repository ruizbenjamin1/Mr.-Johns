// Datos para armar el equipo de una noche, repartiendo parejo.
//
// Cuenta cuántos turnos trabajó cada uno en las últimas semanas (y en qué
// sectores), y ordena a los disponibles de menos a más trabajado. Esto lo
// calcula el código; la IA usa este orden para elegir y repartir sectores.

import type { Convocado } from "./tipos";

export const SEMANAS_EQUIDAD = 4;

export type Candidato = {
  userName: string;
  nombre: string;
  /** Turnos trabajados en las últimas SEMANAS_EQUIDAD semanas (incluida la actual). */
  turnos: number;
  /** Sector -> cantidad de veces que trabajó ahí en ese período. */
  sectores: Record<string, number>;
  nota: string | null;
};

export function historialPorPersona(convocados: Convocado[]) {
  const historial = new Map<string, { turnos: number; sectores: Record<string, number> }>();
  for (const c of convocados) {
    const h = historial.get(c.user_name) ?? { turnos: 0, sectores: {} };
    h.turnos += 1;
    const sector = c.sector || "Principal";
    h.sectores[sector] = (h.sectores[sector] ?? 0) + 1;
    historial.set(c.user_name, h);
  }
  return historial;
}

/** De menos a más trabajado; a igualdad, por nombre (para que el orden sea estable). */
export function ordenarPorEquidad(candidatos: Candidato[]): Candidato[] {
  return [...candidatos].sort((a, b) => a.turnos - b.turnos || a.nombre.localeCompare(b.nombre, "es"));
}
