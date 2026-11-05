import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { CalculoReposicion } from "./reposicion";

// La IA recibe los números YA calculados (lib/reposicion.ts) y solo decide
// la prioridad de cada producto y escribe un motivo corto. No cambia cantidades.

const MODELO = process.env.ANTHROPIC_MODELO_TEXTO || "claude-haiku-5-5";

export type Prioridad = "alta" | "media" | "baja";
export type ExplicacionReposicion = {
  resumen: string;
  items: { producto: string; prioridad: Prioridad; motivo: string }[];
};

export async function explicarReposicion(calculo: CalculoReposicion): Promise<ExplicacionReposicion | null> {
  const aReponer = calculo.lineas.filter((l) => l.reponer > 0);
  if (aReponer.length === 0) return null;

  const tabla = aReponer
    .map(
      (l) =>
        `- ${l.producto} (${l.categoria}): quedó ${l.quedo}, consumo esta semana ${l.consumoSemana}, ` +
        `consumo habitual ${l.consumoHabitual ?? "sin datos"}, reponer ${l.reponer}`
    )
    .join("\n");
  const faltan = Object.entries(calculo.barras)
    .filter(([, e]) => e === "sin-final")
    .map(([b]) => b);

  const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: null });
  const respuesta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 2048,
    system:
      "Sos el asistente de compras de un bar en Argentina. Te paso, por producto, lo que quedó en todas las barras al cierre de la semana, " +
      "lo que se consumió y cuánto conviene reponer (ya calculado: no cambies esas cantidades). " +
      "Asigná prioridad: 'alta' si con lo que quedó no alcanza ni para una noche normal o el producto se agotó; 'media' si alcanza justo; 'baja' si es un refuerzo preventivo. " +
      "El motivo es UNA frase corta y concreta en castellano rioplatense, con números (ej: 'Quedaron 3 y se usan unas 12 por semana'). " +
      "Si el consumo de esta semana fue muy distinto al habitual, mencionalo (puede ser un error de carga). " +
      "El resumen son 1 o 2 frases para el dueño sobre qué es lo más urgente.",
    messages: [
      {
        role: "user",
        content:
          `Semanas usadas para el consumo habitual: ${calculo.semanasComparadas}.\n` +
          (faltan.length ? `Barras que todavía no cerraron el conteo: ${faltan.join(", ")}.\n` : "") +
          `\nProductos a reponer:\n${tabla}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            resumen: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  producto: { type: "string", enum: aReponer.map((l) => l.producto) },
                  prioridad: { type: "string", enum: ["alta", "media", "baja"] },
                  motivo: { type: "string" },
                },
                required: ["producto", "prioridad", "motivo"],
                additionalProperties: false,
              },
            },
          },
          required: ["resumen", "items"],
          additionalProperties: false,
        },
      },
    },
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") return null;
  const datos = JSON.parse(bloque.text) as ExplicacionReposicion;
  return {
    resumen: datos.resumen,
    items: datos.items.filter((i) => aReponer.some((l) => l.producto === i.producto)),
  };
}
