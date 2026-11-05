"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// Botón sol/luna para cambiar entre tema oscuro y claro.
export function BotonTema({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const esClaro = resolvedTheme === "light";

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={() => setTheme(esClaro ? "dark" : "light")}
      aria-label={esClaro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      title="Cambiar tema"
    >
      {/* Los dos íconos se alternan por CSS: así no hay salto al hidratar. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
