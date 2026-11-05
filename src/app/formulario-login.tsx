"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesion, type EstadoLogin } from "./acciones-sesion";

const estadoInicial: EstadoLogin = { error: null };

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, estadoInicial);

  useEffect(() => {
    if (estado.error) toast.error(estado.error);
  }, [estado]);

  return (
    <form action={accion} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="usuario">Usuario</Label>
        <div className="relative">
          <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="usuario"
            name="usuario"
            autoComplete="username"
            autoCapitalize="none"
            required
            className="pl-9"
            aria-invalid={!!estado.error}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="pl-9"
            aria-invalid={!!estado.error}
          />
        </div>
      </div>

      {/* El error también queda escrito debajo, no solo en el toast */}
      {estado.error && (
        <p role="alert" className="text-destructive -mt-2 text-sm">
          {estado.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={enviando} className="w-full font-bold tracking-wide">
        {enviando ? (
          <>
            <Loader2 className="animate-spin" />
            Validando datos...
          </>
        ) : (
          "ENTRAR"
        )}
      </Button>
    </form>
  );
}
