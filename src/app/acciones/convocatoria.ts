"use server";

import { refresh } from "next/cache";
import {
  adminOJefeBarra,
  capturar,
  exigirSesion,
  leerAgendas,
  leerConvocadosDesde,
  leerConvocadosSemana,
  leerUsuarios,
  llamarRpc,
} from "@/lib/datos";
import { historialPorPersona, ordenarPorEquidad, SEMANAS_EQUIDAD } from "@/lib/equipo";
import { sugerirEquipo } from "@/lib/ia-convocatoria";
import { iaDisponible } from "@/lib/ia-stock";
import { esRolAdmin } from "@/lib/roles";
import { SECTORES_BARRA, SECTORES_MOZOS } from "@/lib/sectores";
import { enviarAPlanilla } from "@/lib/apps-script";
import { repartirPropinasBarras, repartirPropinasMozos } from "@/lib/propinas";
import {
  DIAS_SEMANA,
  esConvocadoDelDia,
  estaDisponibilidadVigente,
  fechaHoyArgentina,
  normalizarDiaClave,
  obtenerLunesHaceSemanas,
  obtenerLunesSemanaActual,
  type ClaveDia,
} from "@/lib/turno";

// Convocatoria, sectores y propinas (paneles de Administración y Jefe de Barra).
// Las RPC vuelven a validar el rol con el token: esto es una segunda barrera.

function validarDia(dia: string) {
  if (!(DIAS_SEMANA as readonly string[]).includes(dia)) throw new Error("Día inválido");
}

export async function alternarConvocatoria(userName: string, dia: string, estaConvocado: boolean) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    await llamarRpc(sesion, "gestion_convocatoria", {
      p_user_name: userName,
      p_dia: dia,
      p_accion: estaConvocado ? "quitar" : "agregar",
      p_semana_lunes: obtenerLunesSemanaActual(),
    });
    refresh();
  }, "No se pudo actualizar la convocatoria");
}

export async function guardarSector(userName: string, dia: string, sector: string) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    await llamarRpc(sesion, "gestion_sector_convocado", {
      p_user_name: userName,
      p_dia: dia,
      p_sector: sector,
      p_semana_lunes: obtenerLunesSemanaActual(),
    });
    refresh();
  }, "No se pudo guardar el sector");
}

export async function guardarPropinaConvocado(userName: string, dia: string, monto: number) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    await llamarRpc(sesion, "gestion_propina_convocado", {
      p_user_name: userName,
      p_dia: dia,
      p_monto: Number(monto) || 0,
      p_semana_lunes: obtenerLunesSemanaActual(),
    });
  }, "No se pudo guardar la propina");
}

const limpiarSector = (sector: string) => sector.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").trim();

export async function guardarPropinaBarra(sector: string, dia: string, monto: number) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    await llamarRpc(sesion, "gestion_propina_barra", {
      p_sector_barra: limpiarSector(sector),
      p_dia: dia,
      p_monto: Number(monto) || 0,
    });
  }, "No se pudo guardar la propina de la barra");
}

/**
 * Exporta a la planilla los MOZOS convocados del día con lo que cobra cada uno.
 * Primero guarda las propinas que están en pantalla y después arma las filas
 * con lo que quedó en la base (igual que antes).
 */
export async function exportarMozos(dia: string, propinas: Record<string, number>) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);

    for (const [userName, monto] of Object.entries(propinas)) {
      await llamarRpc(sesion, "gestion_propina_convocado", {
        p_user_name: userName,
        p_dia: dia,
        p_monto: Number(monto) || 0,
        p_semana_lunes: obtenerLunesSemanaActual(),
      });
    }

    const [convocados, usuarios] = await Promise.all([leerConvocadosSemana(), leerUsuarios()]);
    const mozos = convocados
      .filter((c) => esConvocadoDelDia(c.dia, dia))
      .map((c) => ({ convocado: c, usuario: usuarios.find((u) => u.user_name === c.user_name) }))
      .filter((f) => f.usuario?.rol === "mozo");

    if (mozos.length === 0) throw new Error(`No hay mozos convocados para el ${dia}`);

    // A la planilla va lo que COBRA cada uno después del reparto (Cocina +
    // mozos en $0 se dividen el total), no lo que juntó. Ver lib/propinas.ts.
    const reparto = repartirPropinasMozos(
      mozos.map(({ convocado }) => ({
        userName: convocado.user_name,
        sector: convocado.sector || "Principal",
        juntado: convocado.propina_individual || 0,
      }))
    );

    const filas = mozos.map(({ convocado, usuario }) => ({
      semana: fechaHoyArgentina(),
      usuario: usuario!.nombre_real || convocado.user_name,
      rol: `Mozo (${dia})`,
      sector: convocado.sector || "Principal",
      propina: reparto.cobra[convocado.user_name] ?? 0,
    }));

    await enviarAPlanilla({ tipo: "staff", filas });
    return { cantidad: filas.length };
  }, "No se pudo exportar a la planilla");
}

/**
 * Exporta los BARTENDERS convocados del día con lo que cobra cada uno (el
 * total de todas las barras dividido en partes iguales).
 * Si la planilla confirma, las propinas de barra vuelven a $0.
 */
export async function exportarBarras(dia: string, propinasPorSector: Record<string, number>) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);

    const mapa: Record<string, number> = {};
    for (const [sector, monto] of Object.entries(propinasPorSector)) {
      const limpio = limpiarSector(sector);
      mapa[limpio.toLowerCase()] = Number(monto) || 0;
      await llamarRpc(sesion, "gestion_propina_barra", { p_sector_barra: limpio, p_dia: dia, p_monto: Number(monto) || 0 });
    }

    const [convocados, usuarios] = await Promise.all([leerConvocadosSemana(), leerUsuarios()]);
    const bartenders = convocados
      .filter((c) => esConvocadoDelDia(c.dia, dia))
      .map((c) => ({ convocado: c, usuario: usuarios.find((u) => u.user_name === c.user_name) }))
      .filter((f) => f.usuario?.rol === "bartender");

    // La propina de todas las barras se suma y se divide en partes iguales
    // entre los bartenders convocados del día. A la planilla va lo que cobra
    // cada uno. Ver lib/propinas.ts.
    const reparto = repartirPropinasBarras(
      bartenders.map((f) => f.convocado.user_name),
      Object.values(mapa)
    );
    const filas = bartenders.map(({ convocado, usuario }) => ({
      semana: fechaHoyArgentina(),
      usuario: usuario!.nombre_real || convocado.user_name,
      rol: `Bartender (${dia})`,
      sector: convocado.sector || "Principal",
      propina: reparto.cobra[convocado.user_name] ?? 0,
    }));

    if (filas.length === 0) throw new Error(`No hay bartenders convocados para el ${dia}`);

    await enviarAPlanilla({ tipo: "barras", filas });

    for (const sector of Object.keys(propinasPorSector)) {
      await llamarRpc(sesion, "gestion_propina_barra", { p_sector_barra: limpiarSector(sector), p_dia: dia, p_monto: 0 });
    }
    return { cantidad: filas.length };
  }, "No se pudo exportar a la planilla");
}

// === ARMAR EQUIPO CON IA ===

export type SugerenciaEquipo = {
  elegidos: { userName: string; nombre: string; sector: string; motivo: string; turnos: number }[];
  noElegidos: { userName: string; nombre: string; turnos: number }[];
  resumen: string;
  avisos: string[];
};

/**
 * Sugiere a quién convocar según un pedido en lenguaje natural. Los candidatos
 * se arman acá (disponibles ese día y sin convocar), no se toman del navegador.
 */
export async function sugerirEquipoIA(dia: string, puesto: "mozos" | "bartenders", pedido: string) {
  return capturar<SugerenciaEquipo>(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    if (puesto === "mozos" && !esRolAdmin(sesion.rol)) throw new Error("Solo un administrador convoca mozos");
    if (!iaDisponible()) throw new Error("La IA todavía no está configurada");
    if (!pedido.trim()) throw new Error("Escribí qué necesitás, por ejemplo: necesito 4, 2 en Vip y 2 en Principal");

    const rol = puesto === "mozos" ? "mozo" : "bartender";
    const sectores = puesto === "mozos" ? SECTORES_MOZOS : SECTORES_BARRA;
    const [usuarios, agendas, semana, historial] = await Promise.all([
      leerUsuarios(),
      leerAgendas(),
      leerConvocadosSemana(),
      leerConvocadosDesde(obtenerLunesHaceSemanas(SEMANAS_EQUIDAD - 1)),
    ]);
    const delPuesto = usuarios.filter((u) => (u.rol || "").toLowerCase().trim() === rol);
    const nombreDe = (userName: string) => {
      const u = usuarios.find((x) => x.user_name === userName);
      return u?.nombre_real || userName;
    };
    const convocadosHoy = semana.filter((c) => esConvocadoDelDia(c.dia, dia) && delPuesto.some((u) => u.user_name === c.user_name));
    const clave = normalizarDiaClave(dia) as ClaveDia;
    const turnos = historialPorPersona(historial);

    const candidatos = ordenarPorEquidad(
      delPuesto
        .filter((u) => !convocadosHoy.some((c) => c.user_name === u.user_name))
        .map((u) => ({ usuario: u, agenda: agendas.find((a) => a.user_name === u.user_name) }))
        .filter((x) => !!x.agenda && x.agenda[clave] === true && estaDisponibilidadVigente(clave, x.agenda.updated_at))
        .map(({ usuario, agenda }) => ({
          userName: usuario.user_name,
          nombre: usuario.nombre_real || usuario.user_name,
          turnos: turnos.get(usuario.user_name)?.turnos ?? 0,
          sectores: turnos.get(usuario.user_name)?.sectores ?? {},
          nota: agenda!.observaciones?.trim() || null,
        }))
    );
    if (candidatos.length === 0) throw new Error(`No hay ${puesto} disponibles sin convocar para el ${dia}`);

    const sugerencia = await sugerirEquipo({
      pedido: pedido.slice(0, 1000),
      dia,
      puesto,
      sectores,
      candidatos,
      yaConvocados: convocadosHoy.map((c) => ({ nombre: nombreDe(c.user_name), sector: c.sector || "Principal" })),
    });

    const datosDe = (userName: string) => candidatos.find((c) => c.userName === userName)!;
    return {
      elegidos: sugerencia.elegidos.map((e) => ({ ...e, nombre: datosDe(e.userName).nombre, turnos: datosDe(e.userName).turnos })),
      noElegidos: candidatos
        .filter((c) => !sugerencia.elegidos.some((e) => e.userName === c.userName))
        .map((c) => ({ userName: c.userName, nombre: c.nombre, turnos: c.turnos })),
      resumen: sugerencia.resumen,
      avisos: sugerencia.avisos,
    };
  }, "No se pudo armar la sugerencia");
}

/** Convoca a varios de una vez con su sector (lo que confirmó el encargado). */
export async function convocarEquipo(
  dia: string,
  puesto: "mozos" | "bartenders",
  elegidos: { userName: string; sector: string }[]
) {
  return capturar(async () => {
    validarDia(dia);
    const sesion = await exigirSesion(adminOJefeBarra);
    if (puesto === "mozos" && !esRolAdmin(sesion.rol)) throw new Error("Solo un administrador convoca mozos");
    const rol = puesto === "mozos" ? "mozo" : "bartender";
    const sectores: readonly string[] = puesto === "mozos" ? SECTORES_MOZOS : SECTORES_BARRA;
    const usuarios = await leerUsuarios();
    for (const { userName, sector } of elegidos) {
      const u = usuarios.find((x) => x.user_name === userName);
      if (!u || (u.rol || "").toLowerCase().trim() !== rol) throw new Error(`${userName} no es del puesto ${puesto}`);
      if (!sectores.includes(sector)) throw new Error(`Sector inválido: ${sector}`);
    }
    const semanaLunes = obtenerLunesSemanaActual();
    for (const { userName, sector } of elegidos) {
      await llamarRpc(sesion, "gestion_convocatoria", {
        p_user_name: userName,
        p_dia: dia,
        p_accion: "agregar",
        p_semana_lunes: semanaLunes,
      });
      await llamarRpc(sesion, "gestion_sector_convocado", {
        p_user_name: userName,
        p_dia: dia,
        p_sector: sector,
        p_semana_lunes: semanaLunes,
      });
    }
    refresh();
    return { cantidad: elegidos.length };
  }, "No se pudo convocar al equipo");
}
