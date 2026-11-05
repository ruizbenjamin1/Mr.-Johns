"use server";

import { refresh } from "next/cache";
import {
  adminOJefeBarra,
  capturar,
  exigirSesion,
  leerConvocadosSemana,
  leerUsuarios,
  llamarRpc,
} from "@/lib/datos";
import { enviarAPlanilla } from "@/lib/apps-script";
import { DIAS_SEMANA, esConvocadoDelDia, fechaHoyArgentina, obtenerLunesSemanaActual } from "@/lib/turno";

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
 * Exporta a la planilla los MOZOS convocados del día con su propina.
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
    const filas = convocados
      .filter((c) => esConvocadoDelDia(c.dia, dia))
      .map((c) => ({ convocado: c, usuario: usuarios.find((u) => u.user_name === c.user_name) }))
      .filter((f) => f.usuario?.rol === "mozo")
      .map(({ convocado, usuario }) => ({
        semana: fechaHoyArgentina(),
        usuario: usuario!.nombre_real || convocado.user_name,
        rol: `Mozo (${dia})`,
        sector: convocado.sector || "Principal",
        propina: convocado.propina_individual || 0,
      }));

    if (filas.length === 0) throw new Error(`No hay mozos convocados para el ${dia}`);

    await enviarAPlanilla({ tipo: "staff", filas });
    return { cantidad: filas.length };
  }, "No se pudo exportar a la planilla");
}

/**
 * Exporta los BARTENDERS convocados del día con la propina de su barra.
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
    const filas = convocados
      .filter((c) => esConvocadoDelDia(c.dia, dia))
      .map((c) => ({ convocado: c, usuario: usuarios.find((u) => u.user_name === c.user_name) }))
      .filter((f) => f.usuario?.rol === "bartender")
      .map(({ convocado, usuario }) => {
        const sector = convocado.sector || "Principal";
        return {
          semana: fechaHoyArgentina(),
          usuario: usuario!.nombre_real || convocado.user_name,
          rol: `Bartender (${dia})`,
          sector,
          propina: mapa[sector.toLowerCase().trim()] ?? 0,
        };
      });

    if (filas.length === 0) throw new Error(`No hay bartenders convocados para el ${dia}`);

    await enviarAPlanilla({ tipo: "barras", filas });

    for (const sector of Object.keys(propinasPorSector)) {
      await llamarRpc(sesion, "gestion_propina_barra", { p_sector_barra: limpiarSector(sector), p_dia: dia, p_monto: 0 });
    }
    return { cantidad: filas.length };
  }, "No se pudo exportar a la planilla");
}
