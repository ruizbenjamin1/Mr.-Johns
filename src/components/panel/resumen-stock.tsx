import { Boxes } from "lucide-react";
import { soloProductos } from "@/lib/vencimiento-stock";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { BARRAS_STOCK, PRODUCTOS_STOCK } from "@/lib/stock";
import type { ProgresoStock } from "@/lib/tipos";

// Estado del conteo de cada barra esta noche, sin mostrar el detalle
// producto por producto (eso sigue siendo del bartender que cuenta).
export function ResumenStock({ progreso, error }: { progreso: ProgresoStock[]; error?: boolean }) {
  const porBarra = Object.fromEntries(progreso.map((p) => [p.barra, p]));

  return (
    <Seccion titulo="Stock de esta noche" icono={Boxes}>
      {error ? (
        <TextoVacio error>No se pudo cargar el stock.</TextoVacio>
      ) : (
        <div className="grid gap-2">
          {BARRAS_STOCK.map((barra) => {
            const fila = porBarra[barra];
            const cargados = fila
              ? Object.values(soloProductos(fila.valores)).filter((v) => v && (v.inicial || v.final)).length
              : 0;
            return (
              <div key={barra} className="bg-muted/30 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-bold">{barra}</p>
                  <p className="text-muted-foreground text-sm">
                    {fila
                      ? `${fila.responsable || "Sin nombre cargado"} · ${cargados}/${PRODUCTOS_STOCK.length} productos`
                      : "Nadie empezó el conteo todavía."}
                  </p>
                </div>
                {!fila ? (
                  <Badge variant="apagado">Sin iniciar</Badge>
                ) : fila.inicial_enviado ? (
                  <Badge variant="aviso">Inicial enviado</Badge>
                ) : (
                  <Badge variant="barra">En progreso</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Seccion>
  );
}
