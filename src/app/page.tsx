import Image from "next/image";
import { BotonTema } from "@/components/boton-tema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormularioLogin } from "./formulario-login";

// Login (antes index.html + app.js)
export default function PaginaLogin() {
  return (
    <main className="fondo-radial flex min-h-svh items-center justify-center px-4">
      <BotonTema className="fixed top-4 right-4" />

      <Card className="group w-full max-w-sm shadow-2xl">
        <CardHeader className="justify-items-center text-center">
          <Image
            src="/logo.png"
            alt="Mr. John's"
            width={200}
            height={200}
            priority
            className="logo-tema h-auto w-[200px] rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <p className="text-muted-foreground text-sm">
            Ingresá tus credenciales para acceder al sistema
          </p>
        </CardHeader>
        <CardContent>
          <FormularioLogin />
        </CardContent>
      </Card>
    </main>
  );
}
