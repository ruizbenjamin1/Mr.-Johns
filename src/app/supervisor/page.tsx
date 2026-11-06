import { connection } from "next/server";
import { Suspense } from "react";
import { EncabezadoPanel } from "@/components/encabezado-panel";
import { EsqueletoEncabezado, EsqueletoPanelSupervisor } from "@/components/esqueletos";
import { HistorialStock } from "@/components/panel/historial-stock";
import { Reposicion } from "@/components/panel/reposicion";
import { exigirSesion, leerConvocadosSemana, leerUsuarios } from "@/lib/datos";
import { esRolSupervisor } from "@/lib/roles";
import { obtenerDiaHoy, obtenerLunesSemanaActual, textoHoy } from "@/lib/turno";
import { EquipoDelDia } from "./equipo-del-dia";
import { Propinas } from "./propinas";

// Panel de Supervisor (antes supervisor.html + supervisor.js).
// Es de solo lectura: no tiene ningún botón que escriba en la base.
export default function PaginaSupervisor() {
  return (
    <>
      <Suspense fallback={<EsqueletoEncabezado />}>
        <EncabezadoPanel titulo="Panel de Supervisor" />
      </Suspense>
      <Suspense
        fallback={<EsqueletoPanelSupervisor />}
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
  const [usuarios, convocados] = await Promise.all([leerUsuarios(), leerConvocadosSemana(undefined, obtenerLunesSemanaActual())]);

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24">
      <EquipoDelDia usuarios={usuarios} convocados={convocados} diaHoy={obtenerDiaHoy()} textoHoy={textoHoy()} />
      <HistorialStock />
      <Reposicion />
      <Propinas />
    </main>
  );
}
