import { Suspense } from "react";
import { Loader2, UserPlus, UsersRound } from "lucide-react";
import { EncabezadoCargando, EncabezadoPanel } from "@/components/encabezado-panel";
import {
  ProveedorPanel,
  SeccionConvocados,
  SeccionDisponibles,
  SeccionGrilla,
  type ConfigConvocatoria,
} from "@/components/panel/convocatoria";
import { Seccion } from "@/components/panel/seccion";
import { BotonOcultar, FormularioAlta, PanelBloqueado, TablaUsuarios } from "@/components/panel/usuarios";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exigirSesion, leerAgendas, leerConvocadosSemana, leerUsuarios, soloAdmin } from "@/lib/datos";
import { panelDesbloqueado } from "@/app/acciones/usuarios";
import { ExportarMozos } from "./exportar-mozos";

// Panel de Administración (antes admin.html + admin.js).
// Convoca solo MOZOS: los bartenders se convocan desde Jefe de Barra.

const CONFIG_MOZOS: ConfigConvocatoria = {
  modo: "mozos",
  sectores: ["Vip", "Vip/Warhol", "Warhol", "Extension/Altillo", "Principal", "Patio", "Cocina", "Evento"],
  articuloLugar: "el sector",
};

const CATEGORIAS = [
  { valor: "jefes", etiqueta: "Jefes de Barra", rol: "admin_barra" },
  { valor: "mozos", etiqueta: "Mozos", rol: "mozo" },
  { valor: "bartenders", etiqueta: "Bartenders", rol: "bartender" },
  { valor: "supervisores", etiqueta: "Supervisores", rol: "supervisor" },
] as const;

export default function PaginaAdmin() {
  return (
    <>
      <Suspense fallback={<EncabezadoCargando />}>
        <EncabezadoPanel titulo="Panel de Administración" />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        }
      >
        <ContenidoAdmin />
      </Suspense>
    </>
  );
}

async function ContenidoAdmin() {
  await exigirSesion(soloAdmin);
  const [usuarios, agendas, convocados, desbloqueado] = await Promise.all([
    leerUsuarios(),
    leerAgendas(),
    leerConvocadosSemana(),
    panelDesbloqueado("admin"),
  ]);
  const mozos = usuarios.filter((u) => u.rol === "mozo");

  return (
    <ProveedorPanel>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24">
        <SeccionGrilla personal={mozos} agendas={agendas} convocados={convocados} etiquetaConvocado="Sector" />
        <SeccionConvocados personal={mozos} agendas={agendas} convocados={convocados} config={CONFIG_MOZOS} />
        <SeccionDisponibles personal={mozos} agendas={agendas} convocados={convocados} config={CONFIG_MOZOS} />

        <Seccion titulo="Dar de Alta Nuevo Usuario" icono={UserPlus}>
          <FormularioAlta />
        </Seccion>

        <Seccion
          titulo="Gestión Global de Personal"
          icono={UsersRound}
          acciones={desbloqueado ? <BotonOcultar panel="admin" /> : <Badge variant="secondary">Protegido</Badge>}
        >
          {desbloqueado ? (
            <Tabs defaultValue="jefes">
              <TabsList className="w-full flex-wrap">
                {CATEGORIAS.map((c) => (
                  <TabsTrigger key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </TabsTrigger>
                ))}
              </TabsList>
              {CATEGORIAS.map((c) => (
                <TabsContent key={c.valor} value={c.valor}>
                  <TablaUsuarios usuarios={usuarios.filter((u) => u.rol === c.rol)} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <PanelBloqueado
              panel="admin"
              texto="Esta sección está protegida. Ingresá la contraseña para ver los usuarios registrados."
            />
          )}
        </Seccion>

        <ExportarMozos />
      </main>
    </ProveedorPanel>
  );
}
