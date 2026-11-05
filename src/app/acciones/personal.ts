"use server";

import { refresh } from "next/cache";
import { capturar, exigirSesion, llamarRpc } from "@/lib/datos";
import { CLAVES_DIAS, yaPasoEsteDiaEnLaSemana, type ClaveDia } from "@/lib/turno";

// Acciones del Dashboard del personal: agenda semanal y bloc de notas.

export async function guardarAgenda(dias: Record<ClaveDia, boolean>, observaciones: string) {
  return capturar(async () => {
    const sesion = await exigirSesion();
    // Los días que ya pasaron se guardan siempre en false: así se "borra"
    // la disponibilidad de un día vencido aunque alguien fuerce el valor.
    const estado = Object.fromEntries(
      CLAVES_DIAS.map((dia) => [dia, !yaPasoEsteDiaEnLaSemana(dia) && !!dias[dia]])
    ) as Record<ClaveDia, boolean>;

    // El dueño de la agenda lo determina el token, no un user_name del cliente.
    await llamarRpc(sesion, "guardar_agenda", {
      p_lunes: estado.lunes,
      p_martes: estado.martes,
      p_miercoles: estado.miercoles,
      p_jueves: estado.jueves,
      p_viernes: estado.viernes,
      p_sabado: estado.sabado,
      p_domingo: estado.domingo,
      p_observaciones: observaciones.trim(),
    });
    refresh();
  }, "No se pudo guardar la agenda");
}

export async function guardarNota(nota: string) {
  return capturar(async () => {
    const sesion = await exigirSesion();
    await llamarRpc(sesion, "guardar_nota_personal", { p_nota: nota });
  }, "No se pudieron guardar las notas");
}
