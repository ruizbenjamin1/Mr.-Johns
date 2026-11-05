// Reparto de propinas.
//
// === MOZOS ===
// Regla del bar: todo lo que juntaron los mozos esa noche se suma y va para
// quien trabaja en Cocina. Si además algún mozo terminó la noche en $0, el
// total se divide en partes iguales entre Cocina y esos mozos.
//
//   Ana (Vip) $10.000 · Beto (Warhol) $6.000 · Caro (Principal) $0 · Dani (Cocina)
//   Total $16.000 → Dani $8.000 · Caro $8.000 · Ana $0 · Beto $0
//
// Si esa noche nadie está en Cocina, la regla no aplica: cada uno se queda
// con lo que juntó (y el panel muestra un aviso).

export const SECTOR_COCINA = "Cocina";

export type PropinaMozo = {
  userName: string;
  sector: string;
  /** Lo que juntó esa noche. */
  juntado: number;
};

export type ResultadoReparto = {
  /** Lo que cobra cada mozo, por userName. */
  cobra: Record<string, number>;
  total: number;
  /** Quiénes se reparten el total (vacío si no hay nadie en Cocina). */
  beneficiarios: string[];
  hayCocina: boolean;
};

const esCocina = (sector: string) => sector.trim().toLowerCase() === SECTOR_COCINA.toLowerCase();

export function repartirPropinasMozos(mozos: PropinaMozo[]): ResultadoReparto {
  const montos = mozos.map((m) => ({ ...m, juntado: Math.max(0, Math.round(Number(m.juntado) || 0)) }));
  const total = montos.reduce((suma, m) => suma + m.juntado, 0);
  const hayCocina = montos.some((m) => esCocina(m.sector));

  if (!hayCocina) {
    return {
      cobra: Object.fromEntries(montos.map((m) => [m.userName, m.juntado])),
      total,
      beneficiarios: [],
      hayCocina: false,
    };
  }

  // Primero Cocina, después los mozos en $0 (en el orden en que aparecen).
  const beneficiarios = [
    ...montos.filter((m) => esCocina(m.sector)),
    ...montos.filter((m) => !esCocina(m.sector) && m.juntado === 0),
  ].map((m) => m.userName);

  // Cocina primero: si sobra algún peso al dividir, le toca a Cocina.
  const partes = dividirEnPartesIguales(total, beneficiarios);
  const cobra: Record<string, number> = Object.fromEntries(montos.map((m) => [m.userName, partes[m.userName] ?? 0]));

  return { cobra, total, beneficiarios, hayCocina: true };
}

/**
 * Divide un monto en partes iguales de pesos enteros. Si no divide justo, los
 * pesos que sobran van de a uno desde el principio de la lista, así la suma
 * de las partes siempre da exactamente el total.
 */
export function dividirEnPartesIguales(total: number, personas: string[]): Record<string, number> {
  if (personas.length === 0) return {};
  const parte = Math.floor(total / personas.length);
  const resto = total - parte * personas.length;
  return Object.fromEntries(personas.map((p, i) => [p, parte + (i < resto ? 1 : 0)]));
}

// === BARTENDERS ===
// Regla del bar: se suma la propina de todas las barras de la noche y se
// divide en partes iguales entre todos los bartenders convocados ese día.
//
//   Principal $20.000 + Vip $9.000 = $29.000 ÷ 3 bartenders → $9.667 · $9.667 · $9.666

export type ResultadoRepartoBarras = {
  cobra: Record<string, number>;
  total: number;
  /** Lo que cobra cada uno si divide justo (si no, algunos cobran $1 más). */
  porPersona: number;
};

export function repartirPropinasBarras(bartenders: string[], montosPorBarra: number[]): ResultadoRepartoBarras {
  const total = montosPorBarra.reduce((suma, m) => suma + Math.max(0, Math.round(Number(m) || 0)), 0);
  return {
    cobra: dividirEnPartesIguales(total, bartenders),
    total,
    porPersona: bartenders.length ? Math.floor(total / bartenders.length) : 0,
  };
}
