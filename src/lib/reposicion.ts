// Cálculo de reposición: qué reforzar para la próxima semana.
//
// Los números los calcula este código (no la IA), así son siempre los mismos
// y se pueden revisar. La IA solo los ordena por prioridad y explica el motivo.
//
// Para cada producto, sumando todas las barras:
//   - quedó: lo que quedó al cierre (columna Final) en la semana elegida
//   - consumoSemana: lo que se consumió esa semana (Inicial - Final)
//   - consumoHabitual: promedio de lo consumido en las semanas anteriores
//   - reponer: lo que falta para cubrir el consumo esperado con un 20% de margen
//
//   reponer = max(0, redondeo hacia arriba(esperado × 1,2 − quedó))
//   esperado = el mayor entre el consumo habitual y el de esta semana

import { BARRAS_STOCK, PRODUCTOS_STOCK } from "./stock";

export const MARGEN_REPOSICION = 1.2;

export type FilaStock = {
  barra: string;
  producto: string;
  inicial?: number | string;
  final?: number | string;
  diferencia?: number | string;
};

export type EstadoBarra = "cerrada" | "sin-final" | "sin-conteo";

export type LineaReposicion = {
  producto: string;
  categoria: string;
  quedo: number;
  consumoSemana: number;
  consumoHabitual: number | null;
  reponer: number;
};

export type CalculoReposicion = {
  barras: Record<string, EstadoBarra>;
  todasCerradas: boolean;
  semanasComparadas: number;
  lineas: LineaReposicion[];
};

const numero = (v: number | string | undefined): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function estadoBarras(filas: FilaStock[]): Record<string, EstadoBarra> {
  return Object.fromEntries(
    BARRAS_STOCK.map((barra) => {
      const deLaBarra = filas.filter((f) => f.barra === barra);
      if (deLaBarra.length === 0) return [barra, "sin-conteo"];
      return [barra, deLaBarra.some((f) => numero(f.final) !== null) ? "cerrada" : "sin-final"];
    })
  );
}

/** Consumo total por producto en una semana (solo barras que cerraron). */
function consumoPorProducto(filas: FilaStock[]): Map<string, number> {
  const consumo = new Map<string, number>();
  for (const f of filas) {
    const dif = numero(f.diferencia);
    if (dif === null || numero(f.final) === null) continue;
    consumo.set(f.producto, (consumo.get(f.producto) ?? 0) + Math.max(0, dif));
  }
  return consumo;
}

export function calcularReposicion(semana: FilaStock[], anteriores: FilaStock[][]): CalculoReposicion {
  const barras = estadoBarras(semana);
  const contadas = Object.values(barras).filter((e) => e !== "sin-conteo");
  const todasCerradas = contadas.length > 0 && contadas.every((e) => e === "cerrada");

  const consumoActual = consumoPorProducto(semana);
  const historicos = anteriores.filter((s) => s.some((f) => numero(f.final) !== null)).map(consumoPorProducto);

  const quedo = new Map<string, number>();
  for (const f of semana) {
    const fin = numero(f.final);
    if (fin !== null) quedo.set(f.producto, (quedo.get(f.producto) ?? 0) + fin);
  }

  const lineas = PRODUCTOS_STOCK.map(({ nombre, categoria }) => {
    const valores = historicos.map((h) => h.get(nombre)).filter((v): v is number => v !== undefined);
    const consumoHabitual = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    const consumoSemana = consumoActual.get(nombre) ?? 0;
    const esperado = Math.max(consumoHabitual ?? 0, consumoSemana);
    const quedoProducto = quedo.get(nombre) ?? 0;
    const reponer = Math.max(0, Math.ceil(esperado * MARGEN_REPOSICION - quedoProducto - 1e-9));
    return {
      producto: nombre,
      categoria,
      quedo: Math.round(quedoProducto * 100) / 100,
      consumoSemana: Math.round(consumoSemana * 100) / 100,
      consumoHabitual: consumoHabitual === null ? null : Math.round(consumoHabitual * 100) / 100,
      reponer,
    };
  });

  return { barras, todasCerradas, semanasComparadas: historicos.length, lineas };
}
