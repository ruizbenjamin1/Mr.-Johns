"use server";

import { capturar, exigirSesion } from "@/lib/datos";
import { consultarPlanilla } from "@/lib/apps-script";
import { esRolAdmin, esRolJefeBarra, esRolSupervisor } from "@/lib/roles";

// Lecturas de la planilla (historial de stock y propinas).
// Solo para jefe de barra, supervisor y administradores.

const gestion = (rol: string) => esRolAdmin(rol) || esRolJefeBarra(rol) || esRolSupervisor(rol);

export type FilaHistorial = {
  barra: string;
  producto: string;
  responsable: string;
  inicial?: number | string;
  final?: number | string;
  diferencia?: number | string;
};

export type FilaPropina = { fecha: string; barra?: string; nombre?: string; monto: number };

export async function semanasHistorial() {
  return capturar(async () => {
    await exigirSesion(gestion);
    const datos = await consultarPlanilla<{ semanas?: string[] }>({ accion: "semanas" });
    return datos.semanas || [];
  }, "No se pudo conectar con Google Sheets");
}

export async function historialStock(semana: string, barra: string) {
  return capturar(async () => {
    await exigirSesion(gestion);
    const parametros: Record<string, string> = { accion: "historial", semana };
    if (barra) parametros.barra = barra;
    const datos = await consultarPlanilla<{ filas?: FilaHistorial[] }>(parametros);
    return datos.filas || [];
  }, "No se pudo cargar el historial");
}

export async function propinasPlanilla(tipo: "barras" | "mozos") {
  return capturar(async () => {
    await exigirSesion(gestion);
    const datos = await consultarPlanilla<{ filas?: FilaPropina[] }>({ accion: "propinas", tipo });
    return datos.filas || [];
  }, "No se pudieron cargar las propinas");
}
