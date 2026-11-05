"use server";

import { capturar, exigirSesion, llamarRpc } from "@/lib/datos";
import { enviarAPlanilla } from "@/lib/apps-script";
import { parsearNumeroDecimal } from "@/lib/numeros";
import { BARRAS_STOCK, PRODUCTOS_STOCK } from "@/lib/stock";
import { obtenerLunesSemanaActual, ZONA_HORARIA } from "@/lib/turno";
import type { ProgresoStock, ValoresStock } from "@/lib/tipos";

// Conteo de stock del bartender. El progreso se guarda en Supabase por BARRA
// (no por cuenta ni por dispositivo): cualquier bartender de esa barra puede
// seguir el conteo que empezó otro compañero.

function validarBarra(barra: string) {
  if (!(BARRAS_STOCK as readonly string[]).includes(barra)) {
    throw new Error("Barra inválida");
  }
}

function fechaEnvio() {
  return new Date().toLocaleString("es-AR", { timeZone: ZONA_HORARIA });
}

export async function obtenerProgresoStock(barra: string) {
  return capturar(async () => {
    validarBarra(barra);
    const sesion = await exigirSesion();
    const filas = await llamarRpc<ProgresoStock[] | null>(sesion, "obtener_stock_progreso", { p_barra: barra });
    return filas?.[0] ?? null;
  }, "No se pudo cargar el progreso de stock");
}

export async function guardarProgresoStock(
  barra: string,
  responsable: string,
  valores: ValoresStock,
  inicialEnviado: boolean,
  timestampInicial: string | null
) {
  return capturar(async () => {
    validarBarra(barra);
    const sesion = await exigirSesion();
    await llamarRpc(sesion, "guardar_stock_progreso", {
      p_barra: barra,
      p_responsable: responsable,
      p_valores: valores,
      p_inicial_enviado: inicialEnviado,
      p_timestamp_inicial: timestampInicial,
    });
  }, "No se pudo guardar el progreso de stock");
}

/**
 * Envía el Inicial a la planilla (crea la fila) y lo marca como enviado.
 * Devuelve el momento del envío para arrancar el enfriamiento de 5 minutos.
 */
export async function enviarStockInicial(barra: string, responsable: string, valores: ValoresStock) {
  return capturar(async () => {
    validarBarra(barra);
    if (!responsable.trim()) throw new Error("Falta el nombre del responsable");
    const sesion = await exigirSesion();

    const semana = obtenerLunesSemanaActual();
    const fecha = fechaEnvio();
    const filas = PRODUCTOS_STOCK.map((producto) => ({
      semana,
      barra,
      responsable: responsable.trim(),
      producto: producto.nombre,
      inicial: parsearNumeroDecimal(valores[producto.nombre]?.inicial),
      fecha_envio: fecha,
    }));

    await enviarAPlanilla({ modo: "inicial", filas });

    const timestamp = new Date().toISOString();
    await llamarRpc(sesion, "guardar_stock_progreso", {
      p_barra: barra,
      p_responsable: responsable.trim(),
      p_valores: valores,
      p_inicial_enviado: true,
      p_timestamp_inicial: timestamp,
    });
    return { timestampInicial: timestamp };
  }, "No se pudo enviar el Inicial");
}

/**
 * Envía el Final (+ diferencia). El Apps Script completa la misma fila que
 * creó el Inicial. Si llega bien, se limpia el progreso de esa barra.
 */
export async function enviarStockFinal(barra: string, responsable: string, valores: ValoresStock) {
  return capturar(async () => {
    validarBarra(barra);
    if (!responsable.trim()) throw new Error("Falta el nombre del responsable");
    const sesion = await exigirSesion();

    const semana = obtenerLunesSemanaActual();
    const fecha = fechaEnvio();
    const filas = PRODUCTOS_STOCK.map((producto) => {
      const inicial = parsearNumeroDecimal(valores[producto.nombre]?.inicial);
      const final = parsearNumeroDecimal(valores[producto.nombre]?.final);
      return {
        semana,
        barra,
        responsable: responsable.trim(),
        producto: producto.nombre,
        final,
        diferencia: inicial - final,
        fecha_envio: fecha,
      };
    });

    await enviarAPlanilla({ modo: "final", filas });
    // Solo se borra el progreso si la planilla confirmó el envío: si falla,
    // los números quedan guardados para reintentar.
    await llamarRpc(sesion, "limpiar_stock_progreso", { p_barra: barra });
  }, "No se pudo enviar el Final");
}
