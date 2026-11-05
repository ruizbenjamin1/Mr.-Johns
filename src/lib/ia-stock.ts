import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTOS_STOCK } from "./stock";

// Interpretación del conteo de stock con Claude: el bartender dicta, escribe
// o saca una foto, y esto devuelve las cantidades con los nombres EXACTOS
// del inventario. La respuesta viene con formato fijo (structured outputs),
// así que el producto siempre es uno de la lista: no hay nombres inventados.

// Texto dictado: modelo chico y rápido. Foto (letra a mano, planillas):
// modelo más fuerte, que lee mejor imágenes.
const MODELO_TEXTO = process.env.ANTHROPIC_MODELO_TEXTO || "claude-haiku-5-5";
const MODELO_IMAGEN = process.env.ANTHROPIC_MODELO_IMAGEN || "claude-sonnet-5-5";

export function iaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type ItemInterpretado = { producto: string; cantidad: number; textoOriginal: string };
export type NoReconocido = { texto: string; motivo: string };
export type ConteoInterpretado = { items: ItemInterpretado[]; noReconocidos: NoReconocido[] };

export type EntradaConteo = {
  texto?: string;
  /** Foto en base64 (sin el prefijo data:). */
  imagen?: { base64: string; tipo: "image/jpeg" | "image/png" | "image/webp" };
};

const NOMBRES = PRODUCTOS_STOCK.map((p) => p.nombre);

const ESQUEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          producto: { type: "string", enum: NOMBRES, description: "Nombre exacto del inventario" },
          cantidad: { type: "number", description: "Cantidad contada (unidades; puede tener decimales)" },
          textoOriginal: { type: "string", description: "Lo que dijo o escribió el bartender para este producto" },
        },
        required: ["producto", "cantidad", "textoOriginal"],
        additionalProperties: false,
      },
    },
    noReconocidos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string" },
          motivo: { type: "string", description: "Por qué no se pudo cargar, en una frase corta" },
        },
        required: ["texto", "motivo"],
        additionalProperties: false,
      },
    },
  },
  required: ["items", "noReconocidos"],
  additionalProperties: false,
} as const;

function instrucciones(): string {
  const porCategoria = new Map<string, string[]>();
  for (const p of PRODUCTOS_STOCK) {
    porCategoria.set(p.categoria, [...(porCategoria.get(p.categoria) ?? []), p.nombre]);
  }
  const inventario = [...porCategoria.entries()]
    .map(([categoria, nombres]) => `${categoria}:\n${nombres.map((n) => `- ${n}`).join("\n")}`)
    .join("\n\n");

  return `Sos el asistente de conteo de stock de un bar en Argentina. Un bartender te pasa el conteo de una barra (dictado, escrito o en una foto de una planilla o de las botellas) y vos lo convertís en cantidades por producto.

INVENTARIO (usá estos nombres exactos):
${inventario}

REGLAS:
- Asociá cada cosa que mencione con el producto del inventario que corresponda, aunque lo diga distinto: "fernet de 750", "branca setecientos cincuenta" → "Fernet Branca 750ml"; "coca zero de vidrio" → "Coca cola vidrio zero 350ml"; "red bull común" → "Energizante Red Bull 250 ml".
- Los números pueden venir en palabras ("siete", "doce y medio") o con coma decimal ("2,5"). Devolvelos como número.
- Si nombra un producto dos veces, quedate con la última cantidad.
- Cargá SOLO lo que se menciona. No completes productos que no dijo, ni pongas 0 por tu cuenta.
- Si algo es ambiguo (por ejemplo "gin beefeater" sin decir el tamaño cuando hay varios) o no está en el inventario, NO lo adivines: ponelo en noReconocidos con el motivo ("hay Beefeater 1L, 700ml, Pink y Blood Orange: ¿cuál?").
- En fotos de planillas, si hay columnas de inicial y final, usá solo la columna que te indiquen.`;
}

let cliente: Anthropic | null = null;
function obtenerCliente(): Anthropic {
  // Se pasa la clave explícita (y authToken en null) para que nunca se use otra
  // credencial que pudiera haber en el entorno del servidor.
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: null });
  return cliente;
}

export async function interpretarConteo(entrada: EntradaConteo, columna: "inicial" | "final"): Promise<ConteoInterpretado> {
  const contenido: Anthropic.ContentBlockParam[] = [];
  if (entrada.imagen) {
    contenido.push({
      type: "image",
      source: { type: "base64", media_type: entrada.imagen.tipo, data: entrada.imagen.base64 },
    });
  }
  contenido.push({
    type: "text",
    text:
      `Columna que se está cargando: ${columna.toUpperCase()}.\n\n` +
      (entrada.texto?.trim()
        ? `Conteo del bartender:\n"""\n${entrada.texto.trim()}\n"""`
        : "Leé el conteo de la foto."),
  });

  const respuesta = await obtenerCliente().messages.create({
    model: entrada.imagen ? MODELO_IMAGEN : MODELO_TEXTO,
    max_tokens: 4096,
    system: instrucciones(),
    messages: [{ role: "user", content: contenido }],
    output_config: { format: { type: "json_schema", schema: ESQUEMA as unknown as Record<string, unknown> } },
  });

  if (respuesta.stop_reason === "max_tokens") {
    throw new Error("El conteo es muy largo para procesarlo de una vez. Probá cargarlo en dos partes.");
  }
  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new Error("La IA no devolvió el conteo.");

  const datos = JSON.parse(bloque.text) as ConteoInterpretado;
  // Por las dudas, se filtra contra el inventario (el esquema ya lo exige).
  const items = datos.items.filter(
    (i) => NOMBRES.includes(i.producto) && Number.isFinite(i.cantidad) && i.cantidad >= 0
  );
  // Si un producto vino repetido, queda la última cantidad.
  const porProducto = new Map(items.map((i) => [i.producto, i]));
  return { items: [...porProducto.values()], noReconocidos: datos.noReconocidos ?? [] };
}
