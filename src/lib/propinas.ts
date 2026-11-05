// Reparto de la propina de los mozos.
//
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

  // Partes iguales en pesos enteros. Si no divide justo, los pesos que sobran
  // van uno a cada uno desde el principio (Cocina primero), así la suma de lo
  // que cobra cada uno siempre da exactamente el total.
  const parte = Math.floor(total / beneficiarios.length);
  const resto = total - parte * beneficiarios.length;

  const cobra: Record<string, number> = Object.fromEntries(montos.map((m) => [m.userName, 0]));
  beneficiarios.forEach((userName, i) => {
    cobra[userName] = parte + (i < resto ? 1 : 0);
  });

  return { cobra, total, beneficiarios, hayCocina: true };
}
