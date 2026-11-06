import { exigirSesion, ErrorDeAcceso, llamarRpc } from "@/lib/datos";
import { BARRAS_STOCK } from "@/lib/stock";
import type { ValoresStock } from "@/lib/tipos";
import { prepararValores } from "@/lib/stock-servidor";
import { MENSAJE_VENCIDO } from "@/lib/vencimiento-stock";

// Recibe el conteo de stock cuando la app se cierra o pasa a segundo plano.
//
// El navegador lo manda con navigator.sendBeacon, que (a diferencia de un
// fetch o una Server Action) sigue su curso aunque la página se esté cerrando.
// La sesión viaja en la cookie como en cualquier otro pedido.

type Cuerpo = {
  barra?: string;
  responsable?: string;
  valores?: ValoresStock;
  inicialEnviado?: boolean;
  timestampInicial?: string | null;
};

export async function POST(request: Request) {
  let cuerpo: Cuerpo;
  try {
    cuerpo = (await request.json()) as Cuerpo;
  } catch {
    return Response.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const { barra, responsable = "", valores = {}, inicialEnviado = false, timestampInicial = null } = cuerpo;
  if (!barra || !(BARRAS_STOCK as readonly string[]).includes(barra)) {
    return Response.json({ ok: false, error: "Barra inválida" }, { status: 400 });
  }

  try {
    const sesion = await exigirSesion();
    let conHora: ValoresStock;
    try {
      conHora = await prepararValores(sesion, barra, valores);
    } catch (err) {
      // Pasó más de 1 día sin mandarse: ya se borró, no se guarda.
      if (err instanceof Error && err.message === MENSAJE_VENCIDO) {
        return Response.json({ ok: false, error: "Conteo vencido" }, { status: 410 });
      }
      throw err;
    }
    await llamarRpc(sesion, "guardar_stock_progreso", {
      p_barra: barra,
      p_responsable: responsable,
      p_valores: conHora,
      p_inicial_enviado: inicialEnviado,
      p_timestamp_inicial: timestampInicial,
    });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ErrorDeAcceso) return Response.json({ ok: false, error: err.message }, { status: 401 });
    console.error("Error guardando stock al cerrar:", err);
    return Response.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
  }
}
