import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Candidato } from "./equipo";
import { SEMANAS_EQUIDAD } from "./equipo";

// La IA arma el equipo de una noche a partir de un pedido en lenguaje natural
// ("necesito 4, 2 en Vip y 2 en Principal"). Solo puede elegir entre los
// disponibles y entre los sectores que existen (formato fijo de respuesta).
// El criterio es repartir parejo: los candidatos llegan ordenados de menos a
// más trabajado y la IA tiene que respetar ese orden salvo que el pedido diga otra cosa.

const MODELO = process.env.ANTHROPIC_MODELO_TEXTO || "claude-haiku-5-5";

export type Sugerencia = {
  elegidos: { userName: string; sector: string; motivo: string }[];
  resumen: string;
  avisos: string[];
};

export async function sugerirEquipo(params: {
  pedido: string;
  dia: string;
  puesto: "mozos" | "bartenders";
  sectores: readonly string[];
  candidatos: Candidato[];
  yaConvocados: { nombre: string; sector: string }[];
}): Promise<Sugerencia> {
  const { pedido, dia, puesto, sectores, candidatos, yaConvocados } = params;

  // Solo nombre, turnos y nota: el criterio es la cantidad de turnos, no la experiencia.
  const lista = candidatos
    .map(
      (c, i) =>
        `${i + 1}. ${c.nombre} [${c.userName}]: ${c.turnos} turnos en las últimas ${SEMANAS_EQUIDAD} semanas` +
        (c.nota ? `; nota: "${c.nota}"` : "")
    )
    .join("\n");

  const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: null });
  const respuesta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 2048,
    system:
      `Proponés el equipo de ${puesto} de un bar en Argentina para una noche. El encargado revisa y confirma después: ` +
      `todavía no convocaste a nadie, así que hablá siempre en modo propuesta ("Propongo a…"), nunca "Convocados…". ` +
      `ÚNICO CRITERIO: la cantidad de turnos. Los candidatos vienen ordenados de menos a más turnos trabajados: ` +
      `elegí a los primeros de la lista, salvo que el pedido diga explícitamente otra cosa (por ejemplo "sí o sí Lucas"). ` +
      `No tengas en cuenta experiencia ni sectores donde trabajaron antes. Si hay empate en turnos, cualquiera sirve. ` +
      `Repartí a los elegidos en los sectores que pide el pedido; si no dice sectores, poné a todos en "Principal". ` +
      `Los ya convocados cuentan para el total que piden: no los repitas, completá lo que falta. ` +
      `Si pide más personas de las disponibles, elegí a todos y avisalo. ` +
      `Nombrá a cada persona con su nombre completo tal cual aparece en la lista, sin el usuario entre corchetes. ` +
      `El motivo de cada uno es una frase corta sobre sus turnos (ej: "2 turnos en 4 semanas, de los que menos"). ` +
      `El resumen es una frase. En avisos poné solo lo que el encargado tenga que saber: faltan personas, ` +
      `una nota de la agenda que choca con el pedido, o que dejaste afuera a alguien con menos turnos por un pedido explícito. ` +
      `Si no hay nada para avisar, dejá avisos vacío.`,
    messages: [
      {
        role: "user",
        content:
          `Día: ${dia}\nPedido del encargado: "${pedido.trim()}"\n\n` +
          `Ya convocados ese día (${yaConvocados.length}): ` +
          (yaConvocados.length ? yaConvocados.map((y) => `${y.nombre} (${y.sector})`).join(", ") : "nadie") +
          `\n\nDisponibles sin convocar (${candidatos.length}), de menos a más trabajado:\n${lista || "(nadie)"}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            elegidos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userName: { type: "string", enum: candidatos.length ? candidatos.map((c) => c.userName) : ["-"] },
                  sector: { type: "string", enum: [...sectores] },
                  motivo: { type: "string" },
                },
                required: ["userName", "sector", "motivo"],
                additionalProperties: false,
              },
            },
            resumen: { type: "string" },
            avisos: { type: "array", items: { type: "string" } },
          },
          required: ["elegidos", "resumen", "avisos"],
          additionalProperties: false,
        },
      },
    },
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") throw new Error("La IA no devolvió una sugerencia.");
  const datos = JSON.parse(bloque.text) as Sugerencia;

  // Por las dudas: solo candidatos reales, sin repetidos, sectores válidos.
  const vistos = new Set<string>();
  const elegidos = datos.elegidos.filter((e) => {
    const valido = candidatos.some((c) => c.userName === e.userName) && sectores.includes(e.sector) && !vistos.has(e.userName);
    vistos.add(e.userName);
    return valido;
  });
  return { elegidos, resumen: datos.resumen, avisos: datos.avisos ?? [] };
}
