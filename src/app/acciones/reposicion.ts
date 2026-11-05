"use server";

import { capturar, exigirSesion } from "@/lib/datos";
import { consultarPlanilla } from "@/lib/apps-script";
import { iaDisponible } from "@/lib/ia-stock";
import { explicarReposicion, type ExplicacionReposicion } from "@/lib/ia-reposicion";
import { calcularReposicion, type CalculoReposicion, type FilaStock } from "@/lib/reposicion";
import { esRolAdmin, esRolJefeBarra, esRolSupervisor } from "@/lib/roles";

const SEMANAS_DE_COMPARACION = 4;

const gestion = (rol: string) => esRolAdmin(rol) || esRolJefeBarra(rol) || esRolSupervisor(rol);

async function filasDeSemana(semana: string): Promise<FilaStock[]> {
  const datos = await consultarPlanilla<{ filas?: FilaStock[] }>({ accion: "historial", semana });
  return datos.filas || [];
}

export type Recomendacion = {
  calculo: CalculoReposicion;
  ia: ExplicacionReposicion | null;
  /** Si la IA falló, igual se muestran los números. */
  avisoIA: string | null;
};

// Arma la recomendación de qué reforzar para una semana: lee el conteo de esa
// semana y de las 4 anteriores de la planilla, calcula y (si hay IA) explica.
export async function recomendarReposicion(semana: string) {
  return capturar<Recomendacion>(async () => {
    await exigirSesion(gestion);

    const { semanas = [] } = await consultarPlanilla<{ semanas?: string[] }>({ accion: "semanas" });
    if (!semanas.includes(semana)) throw new Error("No hay stock cargado para esa semana");
    const anteriores = [...semanas]
      .sort()
      .filter((s) => s < semana)
      .slice(-SEMANAS_DE_COMPARACION);

    const [actual, ...previas] = await Promise.all([semana, ...anteriores].map(filasDeSemana));
    const calculo = calcularReposicion(actual, previas);

    let ia: ExplicacionReposicion | null = null;
    let avisoIA: string | null = null;
    if (iaDisponible()) {
      try {
        ia = await explicarReposicion(calculo);
      } catch (err) {
        console.error("Error de la IA en reposición:", err);
        avisoIA = "No se pudo generar la explicación con IA; se muestran solo los números.";
      }
    }
    return { calculo, ia, avisoIA };
  }, "No se pudo armar la recomendación");
}
