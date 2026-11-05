"use client";

import { Banknote, Martini, Users } from "lucide-react";
import { toast } from "sonner";
import { exportarBarras, guardarPropinaBarra } from "@/app/acciones/convocatoria";
import { BotonExportar } from "@/components/panel/boton-exportar";
import { usePanel } from "@/components/panel/convocatoria";
import { Seccion } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearPesos } from "@/lib/numeros";
import { repartirPropinasBarras } from "@/lib/propinas";
import { SECTORES_BARRA } from "@/lib/stock";
import { esConvocadoDelDia } from "@/lib/turno";
import type { Convocado, Usuario } from "@/lib/tipos";

/** Bartenders convocados ese día (los mismos que se exportan). */
function convocadosDelDia(bartenders: Usuario[], convocados: Convocado[], dia: string) {
  return convocados
    .filter((c) => esConvocadoDelDia(c.dia, dia))
    .map((c) => ({ convocado: c, usuario: bartenders.find((u) => u.user_name === c.user_name) }))
    .filter((f): f is { convocado: Convocado; usuario: Usuario } => !!f.usuario);
}

// Propinas por sector de barra. Siempre arrancan en $0 (no se precarga el
// último monto): solo cambian si el Jefe de Barra las carga a mano.
// Abajo se ve cómo se divide el total entre los bartenders convocados del día.
export function PropinasBarras({ bartenders, convocados }: { bartenders: Usuario[]; convocados: Convocado[] }) {
  const { dia, propinas, setPropina } = usePanel();
  const delDia = convocadosDelDia(bartenders, convocados, dia);
  const reparto = repartirPropinasBarras(
    delDia.map((f) => f.usuario.user_name),
    SECTORES_BARRA.map((s) => propinas[s] ?? 0)
  );
  const total = reparto.total;

  async function guardar(sector: string) {
    const r = await guardarPropinaBarra(sector, dia, propinas[sector] ?? 0);
    if (!r.ok) toast.error(r.error);
  }

  return (
    <Seccion
      titulo="Propinas Generadas por Sector"
      icono={Banknote}
      tono="barra"
      descripcion={`Propinas del ${dia}.`}
      acciones={
        <Badge variant="barra" className="px-3 py-1.5 text-sm">
          Total: ${formatearPesos(total)}
        </Badge>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sector de Barra</TableHead>
            <TableHead className="text-center">Monto Recaudado $</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SECTORES_BARRA.map((sector) => (
            <TableRow key={sector}>
              <TableCell className="font-bold text-cyan-700 dark:text-barra">
                <span className="flex items-center gap-2">
                  <Martini className="size-4" />
                  {sector}
                </span>
              </TableCell>
              <TableCell>
                <div className="relative mx-auto max-w-48">
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">$</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    // En 0 el campo queda vacío (el "0" es solo el placeholder) para escribir directo
                    value={propinas[sector] ? propinas[sector] : ""}
                    placeholder="0"
                    onChange={(e) => setPropina(sector, Number(e.target.value) || 0)}
                    onBlur={() => guardar(sector)}
                    aria-label={`Propina de la barra ${sector}`}
                    className="h-8 pl-6 text-center"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 grid gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-cyan-700 uppercase dark:text-barra">
          <Users className="size-4" />
          {delDia.length > 0
            ? `Se divide entre ${delDia.length} ${delDia.length === 1 ? "bartender" : "bartenders"}`
            : "División por bartender"}
        </h3>
        {delDia.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay bartenders convocados el {dia}: no hay entre quiénes dividir.
          </p>
        ) : (
          delDia.map(({ usuario, convocado }) => (
            <div
              key={usuario.user_name}
              className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-semibold">{usuario.nombre_real || usuario.user_name}</p>
                <p className="text-muted-foreground text-xs">Barra {convocado.sector || "Principal"}</p>
              </div>
              <Badge variant={reparto.cobra[usuario.user_name] > 0 ? "barra" : "apagado"} className="px-3 py-1 text-sm">
                Cobra ${formatearPesos(reparto.cobra[usuario.user_name] ?? 0)}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Seccion>
  );
}

export function ExportarBarras() {
  const { dia, propinas, setDia } = usePanel();
  const montos = Object.fromEntries(SECTORES_BARRA.map((s) => [s, propinas[s] ?? 0]));
  // Una vez exportado, las propinas vuelven a $0 (en la base y en pantalla).
  return <BotonExportar exportar={() => exportarBarras(dia, montos)} onExito={() => setDia(dia)} />;
}
