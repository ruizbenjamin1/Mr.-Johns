// Fechas y días del turno (antes en legacy/supabase_client.js).
//
// IMPORTANTE: todo se calcula con la hora de Argentina, no con la del lugar
// donde corre el código. Antes todo corría en el navegador (que ya estaba en
// hora argentina), pero ahora parte corre en el servidor, y en Vercel el
// servidor está en UTC: sin esto, el corte de turno de las 6 AM caería a las
// 3 AM de acá.

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/** El turno arranca de noche y recién termina a las 6:00 del día siguiente. */
export const HORA_CORTE_TURNO = 6;

/** Días como se guardan en la base (columna "dia" de convocados y p_dia de las RPC). */
export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

/** Columnas de la tabla agendas, en el mismo orden que DIAS_SEMANA. */
export const CLAVES_DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
export type ClaveDia = (typeof CLAVES_DIAS)[number];

const NOMBRES_POR_GETDAY = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

/** "Sábado", "sábado", "SABADO" -> "sabado" */
export function normalizarDiaClave(dia: string | null | undefined): string {
  return (dia || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Convierte un instante a una fecha "de reloj" argentina: un Date cuyos
 * getFullYear/getMonth/getDate/getHours/getDay dan los valores de Argentina.
 * Solo sirve para leer esos componentes, no para mostrar como instante.
 */
function aRelojArgentino(instante: Date): Date {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(instante);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return new Date(valor("year"), valor("month") - 1, valor("day"), valor("hour"));
}

function formatearFecha(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lunesDe(fecha: Date): Date {
  const diaSemana = fecha.getDay();
  const diferencia = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  return new Date(fecha.getFullYear(), fecha.getMonth(), diferencia);
}

/**
 * "Hoy" según el turno: mientras sea antes de las 6 AM, sigue siendo ayer.
 * Así el personal convocado para "anoche" no desaparece apenas pasa la medianoche.
 */
export function obtenerFechaOperativa(ahora: Date = new Date()): Date {
  const reloj = aRelojArgentino(ahora);
  if (reloj.getHours() < HORA_CORTE_TURNO) {
    return new Date(reloj.getFullYear(), reloj.getMonth(), reloj.getDate() - 1);
  }
  return new Date(reloj.getFullYear(), reloj.getMonth(), reloj.getDate());
}

/** Lunes de la semana operativa actual, en YYYY-MM-DD. */
export function obtenerLunesSemanaActual(ahora: Date = new Date()): string {
  return formatearFecha(lunesDe(obtenerFechaOperativa(ahora)));
}

/** Lunes de la semana de cualquier timestamp (por ejemplo updated_at), en YYYY-MM-DD. */
export function obtenerLunesDeFecha(fechaInput: string | Date): string {
  return formatearFecha(lunesDe(aRelojArgentino(new Date(fechaInput))));
}

/** Nombre del día operativo de hoy ("Sábado"). */
export function obtenerDiaHoy(ahora: Date = new Date()): DiaSemana {
  return NOMBRES_POR_GETDAY[obtenerFechaOperativa(ahora).getDay()];
}

/** Índice 0-6 del día de hoy, con Lunes = 0. */
function indiceDiaHoy(ahora: Date = new Date()): number {
  return (obtenerFechaOperativa(ahora).getDay() + 6) % 7;
}

/** true si ese día de la semana actual ya pasó. */
export function yaPasoEsteDiaEnLaSemana(dia: string, ahora: Date = new Date()): boolean {
  const indice = (CLAVES_DIAS as readonly string[]).indexOf(normalizarDiaClave(dia));
  if (indice === -1) return false;
  return indice < indiceDiaHoy(ahora);
}

/**
 * La disponibilidad marcada para un día vale si ese día todavía no pasó
 * y la agenda se guardó dentro de la semana actual (no es de una semana vieja).
 */
export function estaDisponibilidadVigente(
  dia: string,
  fechaActualizacion: string | null | undefined,
  ahora: Date = new Date()
): boolean {
  if (yaPasoEsteDiaEnLaSemana(dia, ahora)) return false;
  if (!fechaActualizacion) return false;
  return obtenerLunesDeFecha(fechaActualizacion) === obtenerLunesSemanaActual(ahora);
}

/** "Semana del 2 al 8 de Noviembre" (o con los dos meses si la semana cruza de mes). */
export function textoRangoSemanaActual(ahora: Date = new Date()): string {
  const lunes = lunesDe(obtenerFechaOperativa(ahora));
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  const mes = (f: Date) => f.toLocaleDateString("es-AR", { month: "long" });
  const mesLunes = mes(lunes);
  const mesDomingo = mes(domingo);
  if (mesLunes === mesDomingo) {
    return `Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${mesLunes.charAt(0).toUpperCase() + mesLunes.slice(1)}`;
  }
  return `Semana del ${lunes.getDate()} de ${mesLunes} al ${domingo.getDate()} de ${mesDomingo}`;
}

/** "Hoy es Sábado, 7 de noviembre" (para el panel del supervisor). */
export function textoHoy(ahora: Date = new Date()): string {
  const fecha = obtenerFechaOperativa(ahora);
  const legible = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `Hoy es ${obtenerDiaHoy(ahora)}, ${legible}`;
}

/** Fecha de hoy (Argentina) en YYYY-MM-DD, para la columna "semana" de las exportaciones. */
export function fechaHoyArgentina(ahora: Date = new Date()): string {
  return formatearFecha(aRelojArgentino(ahora));
}

/** Un convocado sin "dia" cargado es de los registros viejos, que eran todos del sábado. */
export function esConvocadoDelDia(diaConvocado: string | null | undefined, dia: string): boolean {
  if (!diaConvocado) return dia === "Sábado";
  return normalizarDiaClave(diaConvocado) === normalizarDiaClave(dia);
}
