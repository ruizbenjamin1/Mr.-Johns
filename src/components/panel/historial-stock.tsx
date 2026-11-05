"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Search } from "lucide-react";
import { EsqueletoTabla } from "@/components/esqueletos";
import { toast } from "sonner";
import { historialStock, semanasHistorial, type FilaHistorial } from "@/app/acciones/planilla";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BARRAS_STOCK } from "@/lib/stock";

const mostrar = (valor: number | string | undefined) => (valor === "" || valor === undefined ? "—" : String(valor));

// Historial de stock leído de la planilla (jefe de barra y supervisor).
export function HistorialStock() {
  const [semanas, setSemanas] = useState<string[] | null>(null);
  const [errorSemanas, setErrorSemanas] = useState(false);
  const [semana, setSemana] = useState("");
  const [barra, setBarra] = useState("");
  const [filas, setFilas] = useState<FilaHistorial[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorFilas, setErrorFilas] = useState<string | null>(null);

  useEffect(() => {
    semanasHistorial().then((r) => {
      if (r.ok) {
        setSemanas(r.datos);
        setSemana(r.datos[0] ?? "");
      } else {
        setErrorSemanas(true);
      }
    });
  }, []);

  async function ver() {
    if (!semana) {
      toast.error("Elegí una semana primero.");
      return;
    }
    setCargando(true);
    setErrorFilas(null);
    const r = await historialStock(semana, barra);
    setCargando(false);
    if (r.ok) setFilas(r.datos);
    else setErrorFilas(r.error);
  }

  return (
    <Seccion
      titulo="Historial de Stock"
      icono={History}
      descripcion="Elegí una semana (y, si querés, una barra puntual) para ver todo lo que se cargó. Se lee directo de la planilla."
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <NativeSelect value={semana} onChange={(e) => setSemana(e.target.value)} disabled={!semanas?.length}>
          {semanas === null && !errorSemanas && <option value="">Cargando semanas...</option>}
          {errorSemanas && <option value="">No se pudo conectar con Google Sheets</option>}
          {semanas?.length === 0 && <option value="">No hay stock cargado todavía</option>}
          {semanas?.map((s) => (
            <option key={s} value={s}>
              Semana del {s}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={barra} onChange={(e) => setBarra(e.target.value)}>
          <option value="">Todas las barras</option>
          {BARRAS_STOCK.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </NativeSelect>
        <Button onClick={ver} disabled={cargando || !semana}>
          {cargando ? <Loader2 className="animate-spin" /> : <Search />}
          Ver
        </Button>
      </div>

      {cargando ? (
        <EsqueletoTabla filas={6} columnas={6} />
      ) : errorFilas ? (
        <TextoVacio error>{errorFilas}</TextoVacio>
      ) : filas === null ? (
        <TextoVacio>Elegí una semana y tocá &quot;Ver&quot; para consultar el historial.</TextoVacio>
      ) : filas.length === 0 ? (
        <TextoVacio>No hay filas cargadas para esa búsqueda.</TextoVacio>
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Barra</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-center">Inicial</TableHead>
              <TableHead className="text-center">Final</TableHead>
              <TableHead className="text-center">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f, i) => (
              <TableRow key={`${f.barra}-${f.producto}-${i}`}>
                <TableCell>{f.barra}</TableCell>
                <TableCell>{f.producto}</TableCell>
                <TableCell>{f.responsable}</TableCell>
                <TableCell className="text-center">{mostrar(f.inicial)}</TableCell>
                <TableCell className="text-center">{mostrar(f.final)}</TableCell>
                <TableCell className="text-center font-bold">{mostrar(f.diferencia)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Seccion>
  );
}
