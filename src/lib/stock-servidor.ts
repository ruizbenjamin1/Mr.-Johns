import "server-only";
import { llamarRpc } from "./datos";
import type { Sesion } from "./sesion";
import type { ProgresoStock, ValoresStock } from "./tipos";
import { CLAVE_INICIO, estaVencido, inicioDelConteo, MENSAJE_VENCIDO } from "./vencimiento-stock";

/**
 * Antes de guardar o enviar: la hora de inicio es la más vieja entre la que ya
 * está guardada y la que trae el celular (así ningún celular reinicia el
 * plazo). Si pasó más de 1 día, borra el conteo de la barra y avisa.
 */
export async function prepararValores(sesion: Sesion, barra: string, valores: ValoresStock): Promise<ValoresStock> {
  const filas = await llamarRpc<ProgresoStock[] | null>(sesion, "obtener_stock_progreso", { p_barra: barra });
  const inicios = [inicioDelConteo(filas?.[0]?.valores), inicioDelConteo(valores)].filter((x): x is number => x !== null);
  const inicio = inicios.length ? Math.min(...inicios) : Date.now();
  const resultado = { ...valores, [CLAVE_INICIO]: { inicial: new Date(inicio).toISOString(), final: "" } };
  if (estaVencido(resultado)) {
    await llamarRpc(sesion, "limpiar_stock_progreso", { p_barra: barra });
    throw new Error(MENSAJE_VENCIDO);
  }
  return resultado;
}
