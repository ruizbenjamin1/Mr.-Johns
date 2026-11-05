"use server";

import { capturar, exigirSesion } from "@/lib/datos";
import { iaDisponible, interpretarConteo, type ConteoInterpretado, type EntradaConteo } from "@/lib/ia-stock";
import { esRolAdmin, esRolDeBarra } from "@/lib/roles";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_TEXTO = 5000;
const MAX_IMAGEN_BASE64 = 4 * 1024 * 1024; // ~3 MB de imagen

// Interpreta un conteo dictado, escrito o en foto. No guarda nada: devuelve
// la propuesta para que el bartender la revise y la confirme en pantalla.
export async function interpretarStockConIA(entrada: EntradaConteo, columna: "inicial" | "final") {
  return capturar<ConteoInterpretado>(async () => {
    await exigirSesion((rol) => esRolDeBarra(rol) || esRolAdmin(rol));
    if (!iaDisponible()) throw new Error("La carga con IA todavía no está configurada");
    if (columna !== "inicial" && columna !== "final") throw new Error("Columna inválida");

    const texto = (entrada.texto ?? "").slice(0, MAX_TEXTO);
    let imagen = entrada.imagen;
    if (imagen) {
      if (!TIPOS_IMAGEN.includes(imagen.tipo)) throw new Error("Formato de foto no soportado");
      if (imagen.base64.length > MAX_IMAGEN_BASE64) throw new Error("La foto es muy pesada");
    } else {
      imagen = undefined;
    }
    if (!texto.trim() && !imagen) throw new Error("Dictá, escribí o sacá una foto del conteo");

    return interpretarConteo({ texto, imagen }, columna);
  }, "No se pudo interpretar el conteo");
}
