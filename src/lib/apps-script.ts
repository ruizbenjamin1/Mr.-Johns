import "server-only";

// Comunicación con el Apps Script de Google Sheets (stock + propinas).
//
// Antes el navegador le pegaba con fetch(mode: "no-cors"), que no deja leer la
// respuesta: nunca se sabía si la planilla recibió el envío. Desde el servidor
// no hay CORS, así que ahora se lee la respuesta y se confirma de verdad.
// Además la URL del script ya no queda expuesta en el código del navegador.

function urlAppsScript(): string {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error("Falta APPS_SCRIPT_URL en las variables de entorno (ver .env.example).");
  return url;
}

type RespuestaAppsScript = { status?: string; error?: string; [clave: string]: unknown };

async function leerRespuesta(respuesta: Response): Promise<RespuestaAppsScript | null> {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto) as RespuestaAppsScript;
  } catch {
    // Algunas versiones del script devuelven texto plano en el doPost.
    return null;
  }
}

/** POST a la planilla. Tira error si el script no respondió bien. */
export async function enviarAPlanilla(payload: unknown): Promise<void> {
  // Apps Script responde el POST con una redirección; fetch la sigue sola.
  const respuesta = await fetch(urlAppsScript(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new Error(`La planilla respondió con error ${respuesta.status}.`);
  }
  const datos = await leerRespuesta(respuesta);
  if (datos && datos.status && datos.status !== "success") {
    throw new Error(datos.error || "La planilla rechazó el envío.");
  }
}

/** GET de solo lectura (historial de stock, propinas). */
export async function consultarPlanilla<T extends RespuestaAppsScript>(
  parametros: Record<string, string>
): Promise<T> {
  const url = new URL(urlAppsScript());
  Object.entries(parametros).forEach(([clave, valor]) => url.searchParams.set(clave, valor));
  const respuesta = await fetch(url, { cache: "no-store" });
  if (!respuesta.ok) throw new Error(`La planilla respondió con error ${respuesta.status}.`);
  const datos = (await leerRespuesta(respuesta)) as T | null;
  if (!datos || datos.status !== "success") {
    throw new Error(
      datos?.error ||
        'Respuesta inesperada del Apps Script. Puede que falte publicar la versión nueva (Implementar > Administrar implementaciones > "Nueva versión").'
    );
  }
  return datos;
}
