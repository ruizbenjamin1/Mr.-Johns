"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DIAS_SEMANA, estaDisponibilidadVigente, esConvocadoDelDia, normalizarDiaClave, type ClaveDia } from "@/lib/turno";
import type { Agenda, Convocado, Usuario } from "@/lib/tipos";

// Vista semanal (admin y jefe de barra): quién está disponible / convocado
// cada día de un vistazo. Tocar una celda salta a ese día en la gestión.
export function GrillaSemanal({
  personal,
  agendas,
  convocados,
  etiquetaConvocado,
  onSeleccionarDia,
}: {
  personal: Usuario[];
  agendas: Agenda[];
  convocados: Convocado[];
  etiquetaConvocado: string;
  onSeleccionarDia: (dia: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <Badge variant="exito">{etiquetaConvocado}</Badge> Convocado
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="aviso">Disponible</Badge> Disponible, sin convocar
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="apagado">—</Badge> Sin disponibilidad
        </span>
      </div>

      {personal.length === 0 ? (
        <p className="text-muted-foreground py-2 text-center text-sm">Sin personal para mostrar.</p>
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Personal</TableHead>
              {DIAS_SEMANA.map((dia) => (
                <TableHead key={dia} className="text-center">
                  {dia.slice(0, 3)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {personal.map((usuario) => {
              const agenda = agendas.find((a) => a.user_name === usuario.user_name);
              return (
                <TableRow key={usuario.user_name}>
                  <TableCell className="font-semibold">{usuario.nombre_real || usuario.user_name}</TableCell>
                  {DIAS_SEMANA.map((dia) => {
                    const clave = normalizarDiaClave(dia) as ClaveDia;
                    const convocado = convocados.find(
                      (c) => c.user_name === usuario.user_name && esConvocadoDelDia(c.dia, dia)
                    );
                    const disponible =
                      !!agenda && agenda[clave] === true && estaDisponibilidadVigente(clave, agenda.updated_at);
                    const texto = convocado ? convocado.sector || "Convocado" : disponible ? "Disponible" : "—";
                    return (
                      <TableCell key={dia} className="text-center">
                        <button
                          type="button"
                          onClick={() => onSeleccionarDia(dia)}
                          aria-label={`Ir a ${dia}: ${texto}`}
                          className="rounded-md focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
                        >
                          <Badge variant={convocado ? "exito" : disponible ? "aviso" : "apagado"}>{texto}</Badge>
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
