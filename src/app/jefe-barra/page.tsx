import { Suspense } from "react";
import { Loader2, Settings, UserPlus } from "lucide-react";
import { panelDesbloqueado } from "@/app/acciones/usuarios";
import { EncabezadoCargando, EncabezadoPanel } from "@/components/encabezado-panel";
import {
  ProveedorPanel,
  SeccionConvocados,
  SeccionDisponibles,
  SeccionGrilla,
  type ConfigConvocatoria,
} from "@/components/panel/convocatoria";
import { HistorialStock } from "@/components/panel/historial-stock";
import { ResumenStock } from "@/components/panel/resumen-stock";
import { Seccion } from "@/components/panel/seccion";
import { BotonOcultar, FormularioAlta, PanelBloqueado, TablaUsuarios } from "@/components/panel/usuarios";
import { Badge } from "@/components/ui/badge";
import { adminOJefeBarra, exigirSesion, leerAgendas, leerConvocadosSemana, leerUsuarios, llamarRpc } from "@/lib/datos";
import type { ProgresoStock } from "@/lib/tipos";
import { SECTORES_BARRA } from "@/lib/stock";
import { ExportarBarras, PropinasBarras } from "./propinas-barras";

// Panel de Jefe de Barra (antes jefe_barra.html + jefe_barra.js).
// Gestiona solo rol "bartender": el Jefe de Barra es gestión, no personal convocable.

const CONFIG_BARTENDERS: ConfigConvocatoria = {
  modo: "bartenders",
  sectores: SECTORES_BARRA,
  articuloLugar: "la barra",
};

export default function PaginaJefeBarra() {
  return (
    <>
      <Suspense fallback={<EncabezadoCargando />}>
        <EncabezadoPanel titulo="Jefe de Barra" />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        }
      >
        <ContenidoJefeBarra />
      </Suspense>
    </>
  );
}

async function ContenidoJefeBarra() {
  const sesion = await exigirSesion(adminOJefeBarra);
  const [usuarios, agendas, convocados, desbloqueado, stock] = await Promise.all([
    leerUsuarios(),
    leerAgendas(),
    leerConvocadosSemana(),
    panelDesbloqueado("jefe-barra"),
    llamarRpc<ProgresoStock[] | null>(sesion, "listar_stock_progreso")
      .then((filas) => ({ filas: filas || [], error: false }))
      .catch(() => ({ filas: [] as ProgresoStock[], error: true })),
  ]);
  const bartenders = usuarios.filter((u) => (u.rol || "").toLowerCase().trim() === "bartender");

  return (
    <ProveedorPanel>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24">
        <SeccionGrilla personal={bartenders} agendas={agendas} convocados={convocados} etiquetaConvocado="Barra" />
        <SeccionConvocados personal={bartenders} agendas={agendas} convocados={convocados} config={CONFIG_BARTENDERS} />
        <SeccionDisponibles personal={bartenders} agendas={agendas} convocados={convocados} config={CONFIG_BARTENDERS} />
        <PropinasBarras />
        <HistorialStock />
        <ResumenStock progreso={stock.filas} error={stock.error} />

        <Seccion titulo="Registrar Nuevo Bartender" icono={UserPlus}>
          <FormularioAlta rolFijo="bartender" />
        </Seccion>

        <Seccion
          titulo="Gestionar Bartenders Registrados"
          icono={Settings}
          acciones={desbloqueado ? <BotonOcultar panel="jefe-barra" /> : <Badge variant="secondary">Protegido</Badge>}
        >
          {desbloqueado ? (
            <TablaUsuarios usuarios={bartenders} rolFijo="bartender" />
          ) : (
            <PanelBloqueado
              panel="jefe-barra"
              texto="Esta sección está protegida. Ingresá la contraseña para ver los bartenders registrados."
            />
          )}
        </Seccion>

        <ExportarBarras />
      </main>
    </ProveedorPanel>
  );
}
