import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONOS = {
  neutro: "text-foreground",
  oro: "text-amber-700 dark:text-primary",
  exito: "text-emerald-700 dark:text-exito",
  barra: "text-cyan-700 dark:text-barra",
} as const;

// Tarjeta con título e ícono: la unidad básica de todos los paneles.
export function Seccion({
  titulo,
  icono: Icono,
  tono = "neutro",
  descripcion,
  acciones,
  children,
  className,
}: {
  titulo: string;
  icono: LucideIcon;
  tono?: keyof typeof TONOS;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-1.5">
          <CardTitle className={cn("flex items-center gap-2 text-base font-bold", TONOS[tono])}>
            <Icono className="size-4" />
            {titulo}
          </CardTitle>
          {descripcion && <CardDescription>{descripcion}</CardDescription>}
        </div>
        {acciones}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function TextoVacio({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={cn("py-2 text-center text-sm", error ? "text-destructive" : "text-muted-foreground")}>{children}</p>
  );
}
