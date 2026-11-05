"use client";

import { Banknote, Martini } from "lucide-react";
import { toast } from "sonner";
import { exportarBarras, guardarPropinaBarra } from "@/app/acciones/convocatoria";
import { BotonExportar } from "@/components/panel/boton-exportar";
import { usePanel } from "@/components/panel/convocatoria";
import { Seccion } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearPesos } from "@/lib/numeros";
import { SECTORES_BARRA } from "@/lib/stock";

// Propinas por sector de barra. Siempre arrancan en $0 (no se precarga el
// último monto): solo cambian si el Jefe de Barra las carga a mano.
export function PropinasBarras() {
  const { dia, propinas, setPropina } = usePanel();
  const total = SECTORES_BARRA.reduce((suma, s) => suma + (propinas[s] ?? 0), 0);

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
                    value={propinas[sector] ?? 0}
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
    </Seccion>
  );
}

export function ExportarBarras() {
  const { dia, propinas, setDia } = usePanel();
  const montos = Object.fromEntries(SECTORES_BARRA.map((s) => [s, propinas[s] ?? 0]));
  // Una vez exportado, las propinas vuelven a $0 (en la base y en pantalla).
  return <BotonExportar exportar={() => exportarBarras(dia, montos)} onExito={() => setDia(dia)} />;
}
