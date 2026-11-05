import { Suspense } from "react";
import { BookOpen, ClipboardCheck, Loader2 } from "lucide-react";
import { EncabezadoPanel } from "@/components/encabezado-panel";
import { Seccion } from "@/components/panel/seccion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exigirSesion, leerAgenda, leerConvocadosSemana, leerUsuario, llamarRpc } from "@/lib/datos";
import { esRolDeBarra } from "@/lib/roles";
import {
  CLAVES_DIAS,
  esConvocadoDelDia,
  estaDisponibilidadVigente,
  obtenerDiaHoy,
  obtenerLunesDeFecha,
  obtenerLunesSemanaActual,
  textoRangoSemanaActual,
  yaPasoEsteDiaEnLaSemana,
  type ClaveDia,
} from "@/lib/turno";
import { AgendaSemanal, type EstadoAgenda } from "./agenda-semanal";
import { BlocNotas } from "./bloc-notas";
import { ListaBebidas, ListaComidas } from "./carta";
import { ConteoStock } from "./conteo-stock";

// Panel del personal (antes legacy/Dashboard.html + Dashboard.js).
export default function PaginaDashboard() {
  return (
    <Suspense fallback={<Cargando />}>
      <ContenidoDashboard />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

async function ContenidoDashboard() {
  const sesion = await exigirSesion();
  const esDeBarra = esRolDeBarra(sesion.rol);

  const [usuario, convocados, agenda, nota] = await Promise.all([
    leerUsuario(sesion.usuario),
    leerConvocadosSemana(sesion.usuario),
    leerAgenda(sesion.usuario),
    esDeBarra ? Promise.resolve("") : llamarRpc<string | null>(sesion, "obtener_nota_personal").catch(() => ""),
  ]);

  const nombre = usuario?.nombre_real || sesion.nombre;
  const rol = usuario?.rol || sesion.rol;
  const puesto = rol.charAt(0).toUpperCase() + rol.slice(1);

  // Agenda: un día que ya pasó queda bloqueado y sin confirmar; una agenda de
  // una semana anterior se ignora y arranca en blanco.
  const agendaVigente = !!agenda?.updated_at && obtenerLunesDeFecha(agenda.updated_at) === obtenerLunesSemanaActual();
  const vencidos = Object.fromEntries(CLAVES_DIAS.map((d) => [d, yaPasoEsteDiaEnLaSemana(d)])) as Record<ClaveDia, boolean>;
  const dias = Object.fromEntries(
    CLAVES_DIAS.map((d) => [
      d,
      !vencidos[d] && !!agenda && estaDisponibilidadVigente(d, agenda.updated_at) && !!agenda[d],
    ])
  ) as Record<ClaveDia, boolean>;
  const estadoAgenda: EstadoAgenda = {
    dias,
    vencidos,
    observaciones: agendaVigente ? agenda?.observaciones || "" : "",
    vigente: agendaVigente,
    textoSemana: textoRangoSemanaActual(),
  };

  // Convocatoria del DÍA DE HOY (con el corte de turno a las 6 AM).
  const diaHoy = obtenerDiaHoy();
  const convocadoHoy = convocados.filter((c) => esConvocadoDelDia(c.dia, diaHoy));

  return (
    <>
      <EncabezadoPanel titulo="Staff Panel" detalle={`${nombre}: ${puesto}`} />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-6 px-4 py-6 pb-24">
        {convocadoHoy.length > 0 && (
          <Seccion
            titulo="Equipo Convocado para el Turno"
            icono={ClipboardCheck}
            tono="exito"
            acciones={<Badge variant="exito">Planilla Oficial</Badge>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personal</TableHead>
                  <TableHead className="text-center">Día</TableHead>
                  <TableHead className="text-center">{esDeBarra ? "Barra" : "Sector"}</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convocadoHoy.map((c) => (
                  <TableRow key={`${c.user_name}-${c.dia}`} className="bg-exito/5">
                    <TableCell className="font-bold text-emerald-700 dark:text-exito">
                      {nombre}
                      <Badge variant="exito" className="ml-2">
                        Vos (Hoy)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c.dia || diaHoy}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={esDeBarra ? "barra" : "aviso"} className="uppercase">
                        {c.sector || "Principal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs font-semibold text-emerald-700 dark:text-exito">
                      Convocado Hoy
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>
        )}

        <AgendaSemanal inicial={estadoAgenda} />

        <section className="grid gap-3">
          <h2 className="flex items-center gap-2 font-bold text-amber-700 dark:text-primary">
            <BookOpen className="size-4" />
            Consulta de Carta
          </h2>
          {/* Bartenders: Bebidas + Stock. Mozos: Comidas + Bebidas + Notas. */}
          <Tabs defaultValue={esDeBarra ? "bebidas" : "comidas"}>
            <TabsList className="w-full">
              {!esDeBarra && <TabsTrigger value="comidas">Comidas</TabsTrigger>}
              <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
              {esDeBarra ? <TabsTrigger value="stock">Stock</TabsTrigger> : <TabsTrigger value="notas">Notas</TabsTrigger>}
            </TabsList>
            {!esDeBarra && (
              <TabsContent value="comidas">
                <ListaComidas />
              </TabsContent>
            )}
            <TabsContent value="bebidas">
              <ListaBebidas />
            </TabsContent>
            {esDeBarra ? (
              // forceMount: el conteo no se pierde al pasar a Bebidas y volver
              <TabsContent value="stock" forceMount className="data-[state=inactive]:hidden">
                <ConteoStock />
              </TabsContent>
            ) : (
              <TabsContent value="notas" forceMount className="data-[state=inactive]:hidden">
                <BlocNotas inicial={nota || ""} />
              </TabsContent>
            )}
          </Tabs>
        </section>
      </main>
    </>
  );
}
