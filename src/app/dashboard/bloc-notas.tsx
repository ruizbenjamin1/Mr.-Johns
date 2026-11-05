"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookText, Trash2 } from "lucide-react";
import { guardarNota } from "@/app/acciones/personal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Estado = "sin-cambios" | "escribiendo" | "guardado" | "error";

// Bloc de notas del mozo: se guarda en su cuenta (no en el dispositivo),
// así no se pierde si cambia de celular.
export function BlocNotas({ inicial }: { inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<Estado>(inicial ? "guardado" : "sin-cambios");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function escribir(valor: string) {
    setTexto(valor);
    setEstado("escribiendo");
    if (temporizador.current) clearTimeout(temporizador.current);
    // Se guarda 600 ms después de la última tecla, no en cada una.
    temporizador.current = setTimeout(async () => {
      const r = await guardarNota(valor);
      setEstado(r.ok ? "guardado" : "error");
    }, 600);
  }

  async function vaciar() {
    if (temporizador.current) clearTimeout(temporizador.current);
    setTexto("");
    const r = await guardarNota("");
    setEstado(r.ok ? "sin-cambios" : "error");
  }

  return (
    <Card className="gap-2 p-3 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-primary">
          <NotebookText className="size-4" />
          Bloc de Notas
        </h3>
        <Badge variant={estado === "guardado" ? "exito" : estado === "error" ? "destructive" : "secondary"} aria-live="polite">
          {estado === "guardado" ? "Guardado" : estado === "escribiendo" ? "Escribiendo..." : estado === "error" ? "Sin guardar" : "Sin cambios"}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Anotá acá lo que necesites recordar durante el turno de esta noche. Se guarda en tu cuenta, así la ves desde cualquier dispositivo.
      </p>
      <Textarea
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        rows={10}
        className="min-h-56"
        placeholder="Escribí tus notas del turno..."
        aria-label="Notas del turno"
      />
      <div className="flex justify-end">
        {texto.trim() ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 />
                Vaciar notas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Vaciar todas las notas del turno?</AlertDialogTitle>
                <AlertDialogDescription>Se borran de tu cuenta en todos tus dispositivos.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={vaciar}>Vaciar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <Trash2 />
            Vaciar notas
          </Button>
        )}
      </div>
    </Card>
  );
}
