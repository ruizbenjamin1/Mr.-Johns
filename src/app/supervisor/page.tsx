import { connection } from "next/server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EncabezadoCargando, EncabezadoPanel } from "@/components/encabezado-panel";
import { HistorialStock } from "@/components/panel/historial-stock";
import { exigirSesion, leerConvocadosSemana, leerUsuarios } from "@/lib/datos";
import { esRolSupervisor } from "@/lib/roles";
import { obtenerDiaHoy, textoHoy } from "@/lib/turno";
import { EquipoDelDia } from "./equipo-del-dia";
import { Propinas } from "./propinas";

// Panel de Supervisor (antes supervisor.html + supervisor.js).
// Es de solo lectura: no tiene ningún botón que escriba en la base.
export default function PaginaSupervisor() {
  return (
    <>
      <Suspense fallback={<EncabezadoCargando />}>
        <EncabezadoPanel titulo="Panel de Supervisor" />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        }
      >
        <ContenidoSupervisor />
      </Suspense>
    </>
  );
}

async function ContenidoSupervisor() {
  // Los paneles dependen de la fecha y hora actuales (corte de turno, semana
  // vigente): connection() le avisa a Next que se arman en cada pedido y no
  // se pueden prerenderizar. Sin esto, el build de producción falla al
  // encontrar new Date() durante el prerender.
  await connection();
  await exigirSesion(esRolSupervisor);
  const [usuarios, convocados] = await Promise.all([leerUsuarios(), leerConvocadosSemana()]);

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24">
      <EquipoDelDia usuarios={usuarios} convocados={convocados} diaHoy={obtenerDiaHoy()} textoHoy={textoHoy()} />
      <HistorialStock />
      <Propinas />
    </main>
  );
}
