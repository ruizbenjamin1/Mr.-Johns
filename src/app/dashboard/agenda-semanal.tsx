"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarDays, CloudUpload, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { guardarAgenda } from "@/app/acciones/personal";
import { Seccion } from "@/components/panel/seccion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CLAVES_DIAS, DIAS_SEMANA, type ClaveDia } from "@/lib/turno";

export type EstadoAgenda = {
  dias: Record<ClaveDia, boolean>;
  /** Días que ya pasaron esta semana: quedan bloqueados y sin confirmar. */
  vencidos: Record<ClaveDia, boolean>;
  observaciones: string;
  /** false si todavía no la completó esta semana (muestra el recordatorio). */
  vigente: boolean;
  textoSemana: string;
};

export function AgendaSemanal({ inicial }: { inicial: EstadoAgenda }) {
  const [dias, setDias] = useState(inicial.dias);
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [pendiente, iniciar] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await guardarAgenda(dias, observaciones);
      if (r.ok) toast.success("¡Tu disponibilidad semanal se guardó correctamente!");
      else toast.error(r.error);
    });
  }

  return (
    <Seccion
      titulo="Mi Disponibilidad"
      icono={CalendarDays}
      tono="oro"
      acciones={<Badge variant="outline">Agenda Semanal</Badge>}
      descripcion={<span className="text-amber-700 dark:text-primary font-semibold">{inicial.textoSemana}</span>}
    >
      {!inicial.vigente && (
        <Alert variant="aviso" className="mb-3">
          <AlertTriangle />
          <AlertDescription>
            Todavía no completaste tu disponibilidad de esta semana. Marcá tus días y guardá para que te puedan convocar.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-muted-foreground mb-3 text-sm">
        Marcá los días que estás disponible para el turno de esta semana (Horario base: 19:00 a 06:00 hs).
      </p>

      <form onSubmit={guardar} className="grid gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2/5">Día</TableHead>
              <TableHead className="w-[30%]">¿Disponible?</TableHead>
              <TableHead className="w-[30%]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CLAVES_DIAS.map((clave, i) => {
              const vencido = inicial.vencidos[clave];
              const esSabado = clave === "sabado";
              const id = `disp-${clave}`;
              return (
                <TableRow key={clave} className={cn(esSabado && "bg-primary/10")}>
                  <TableCell className={cn(esSabado && "font-bold text-amber-700 dark:text-primary")}>
                    <label htmlFor={id} className="flex items-center gap-1">
                      {DIAS_SEMANA[i]}
                      {esSabado && <Star className="size-3 fill-current" />}
                    </label>
                  </TableCell>
                  <TableCell>
                    <Switch
                      id={id}
                      checked={!vencido && dias[clave]}
                      disabled={vencido}
                      onCheckedChange={(valor) => setDias((d) => ({ ...d, [clave]: valor }))}
                    />
                  </TableCell>
                  <TableCell>
                    {vencido ? (
                      <Badge variant="apagado">Turno finalizado</Badge>
                    ) : dias[clave] ? (
                      <Badge variant="exito">¡Confirmado!</Badge>
                    ) : (
                      <Badge variant="destructive">No disponible</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="grid gap-2">
          <Label htmlFor="observaciones" className="text-muted-foreground">
            Notas o excepciones horarias (opcional):
          </Label>
          <Input
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: El sábado puedo pero entro a las 20:30"
          />
        </div>

        <Button type="submit" size="lg" disabled={pendiente} className="w-full font-bold">
          {pendiente ? <Loader2 className="animate-spin" /> : <CloudUpload />}
          {pendiente ? "Guardando..." : "ACTUALIZAR AGENDA"}
        </Button>
      </form>
    </Seccion>
  );
}
