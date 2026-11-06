import type { ValoresStock } from "./tipos";

// Un conteo de stock tiene como máximo 1 día para mandarse. Si pasan 24 horas
// desde que se empezó y no se envió el Final, se borra (en el servidor y en el
// respaldo del celular) y la barra arranca de cero.
//
// La hora de inicio viaja junto con los números, en una clave reservada de
// "valores", así no hace falta cambiar la tabla de Supabase.

export const PLAZO_STOCK_MS = 24 * 60 * 60 * 1000;
export const CLAVE_INICIO = "__iniciado_en";
export const MENSAJE_VENCIDO =
  "Pasó más de 1 día desde que se empezó este conteo y no se envió, así que se borró. Empezá uno nuevo.";

/** Momento en que se empezó el conteo (ms), o null si todavía no tiene. */
export function inicioDelConteo(valores: ValoresStock | null | undefined): number | null {
  const texto = valores?.[CLAVE_INICIO]?.inicial;
  const ms = texto ? new Date(texto).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

/** Le pone la hora de inicio si todavía no la tiene (el primer guardado). */
export function conInicio(valores: ValoresStock, ahora: number = Date.now()): ValoresStock {
  if (inicioDelConteo(valores) !== null) return valores;
  return { ...valores, [CLAVE_INICIO]: { inicial: new Date(ahora).toISOString(), final: "" } };
}

/** Hasta cuándo se puede mandar (ms), o null si el conteo todavía no empezó. */
export function venceEn(valores: ValoresStock | null | undefined): number | null {
  const inicio = inicioDelConteo(valores);
  return inicio === null ? null : inicio + PLAZO_STOCK_MS;
}

export function estaVencido(valores: ValoresStock | null | undefined, ahora: number = Date.now()): boolean {
  const limite = venceEn(valores);
  return limite !== null && ahora >= limite;
}

/** Solo los productos (sin la clave reservada). */
export function soloProductos(valores: ValoresStock | null | undefined): ValoresStock {
  const { [CLAVE_INICIO]: _inicio, ...productos } = valores || {};
  void _inicio;
  return productos;
}
