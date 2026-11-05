"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { CalendarRange, CheckCircle2, ChefHat, Loader2, MapPin, MessageCircle, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { alternarConvocatoria, guardarPropinaConvocado, guardarSector } from "@/app/acciones/convocatoria";
import { GrillaSemanal } from "@/components/panel/grilla-semanal";
import { Seccion, TextoVacio } from "@/components/panel/seccion";
import { SelectorDia } from "@/components/panel/selector-dia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { construirEnlaceWhatsApp, formatearPesos } from "@/lib/numeros";
import { repartirPropinasMozos, SECTOR_COCINA } from "@/lib/propinas";
import { esConvocadoDelDia, estaDisponibilidadVigente, normalizarDiaClave, type ClaveDia } from "@/lib/turno";
import { cn } from "@/lib/utils";
import type { Agenda, Convocado, Usuario } from "@/lib/tipos";

// Gestión de convocatoria compartida por Administración (mozos) y Jefe de
// Barra (bartenders). Antes era casi el mismo código copiado en admin.js y
// jefe_barra.js; ahora cambia solo la configuración.

export type ConfigConvocatoria = {
  /** "mozos": con propina individual. "bartenders": la propina es por barra. */
  modo: "mozos" | "bartenders";
  sectores: readonly string[];
  /** Cómo se llama el lugar en el WhatsApp: "el sector" / "la barra". */
  articuloLugar: string;
};

type Estado = {
  dia: string;
  setDia: (dia: string) => void;
  propinas: Record<string, number>;
  setPropina: (userName: string, monto: number) => void;
  /** Sector elegido en pantalla (se usa para el reparto antes de que vuelva el servidor). */
  sectores: Record<string, string>;
  setSectorEnPantalla: (userName: string, sector: string) => void;
};

const ContextoPanel = createContext<Estado | null>(null);

export function usePanel() {
  const contexto = useContext(ContextoPanel);
  if (!contexto) throw new Error("usePanel tiene que usarse dentro de <ProveedorPanel>");
  return contexto;
}

/** El día de gestión arranca en Sábado, como en el sistema viejo. */
export function ProveedorPanel({ diaInicial = "Sábado", children }: { diaInicial?: string; children: React.ReactNode }) {
  const [dia, setDiaEstado] = useState(diaInicial);
  const [propinas, setPropinas] = useState<Record<string, number>>({});
  const [sectores, setSectores] = useState<Record<string, string>>({});
  const setDia = (nuevo: string) => {
    setDiaEstado(nuevo);
    // las propinas y sectores en pantalla son del día elegido
    setPropinas({});
    setSectores({});
  };
  const setPropina = (userName: string, monto: number) => setPropinas((p) => ({ ...p, [userName]: monto }));
  const setSectorEnPantalla = (userName: string, sector: string) => setSectores((s) => ({ ...s, [userName]: sector }));
  return (
    <ContextoPanel.Provider value={{ dia, setDia, propinas, setPropina, sectores, setSectorEnPantalla }}>
      {children}
    </ContextoPanel.Provider>
  );
}

function disponibleEseDia(agenda: Agenda | undefined, dia: string) {
  const clave = normalizarDiaClave(dia) as ClaveDia;
  return !!agenda && agenda[clave] === true && estaDisponibilidadVigente(clave, agenda.updated_at);
}

// === VISTA SEMANAL ===
export function SeccionGrilla({
  personal,
  agendas,
  convocados,
  etiquetaConvocado,
}: {
  personal: Usuario[];
  agendas: Agenda[];
  convocados: Convocado[];
  etiquetaConvocado: string;
}) {
  const { setDia } = usePanel();
  return (
    <Seccion
      titulo="Vista Semanal"
      icono={CalendarRange}
      descripcion="Tocá cualquier celda para saltar a ese día en la gestión de abajo."
    >
      <GrillaSemanal
        personal={personal}
        agendas={agendas}
        convocados={convocados}
        etiquetaConvocado={etiquetaConvocado}
        onSeleccionarDia={(dia) => {
          setDia(dia);
          document.getElementById("equipo-convocado")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
    </Seccion>
  );
}

// === UNA PERSONA CONVOCADA (sector, propina, WhatsApp, quitar) ===
function FilaConvocado({
  usuario,
  convocado,
  config,
  cobra,
}: {
  usuario: Usuario;
  convocado: Convocado;
  config: ConfigConvocatoria;
  /** Mozos: lo que le toca después del reparto. */
  cobra?: number;
}) {
  const { dia, propinas, setPropina, sectores, setSectorEnPantalla } = usePanel();
  const [pendiente, iniciar] = useTransition();
  const sector = sectores[usuario.user_name] ?? convocado.sector ?? "Principal";
  const nombre = usuario.nombre_real || usuario.user_name;
  const propina = propinas[usuario.user_name] ?? convocado.propina_individual ?? 0;

  const mensaje = `Hola ${nombre}! Te convocamos para trabajar el ${dia} en ${config.articuloLugar} ${sector}. Cualquier consulta escribinos. - Mr. Johns`;
  const whatsapp = construirEnlaceWhatsApp(usuario.telefono, mensaje);
  const esMozo = config.modo === "mozos";

  function cambiarSector(nuevo: string) {
    setSectorEnPantalla(usuario.user_name, nuevo);
    iniciar(async () => {
      const r = await guardarSector(usuario.user_name, dia, nuevo);
      if (r.ok) toast.success(esMozo ? "Sector guardado correctamente." : "Barra asignada correctamente.");
      else toast.error(r.error);
    });
  }

  function quitar() {
    iniciar(async () => {
      const r = await alternarConvocatoria(usuario.user_name, dia, true);
      if (r.ok) toast.success(esMozo ? "Personal removido de la convocatoria." : "Bartender removido de la convocatoria.");
      else toast.error(r.error);
    });
  }

  async function guardarPropina() {
    const r = await guardarPropinaConvocado(usuario.user_name, dia, propina);
    if (!r.ok) toast.error(r.error);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2",
        esMozo ? "border-exito/30 bg-exito/5" : "border-barra/30 bg-barra/5"
      )}
    >
      <div className={cn("flex items-center gap-1.5 font-bold", esMozo ? "text-emerald-700 dark:text-exito" : "text-cyan-700 dark:text-barra")}>
        <CheckCircle2 className="size-4" />
        {nombre}
        {esMozo && <span className="text-muted-foreground text-xs font-normal">({usuario.rol})</span>}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <div className="relative w-44">
          <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2" />
          <NativeSelect
            value={sector}
            onChange={(e) => cambiarSector(e.target.value)}
            aria-label={`${esMozo ? "Sector" : "Barra"} de ${nombre}`}
            className="h-8 pl-8"
          >
            {config.sectores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </div>
        {esMozo && (
          <div className="relative w-32">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">$</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={propina}
              onChange={(e) => setPropina(usuario.user_name, Number(e.target.value) || 0)}
              onBlur={guardarPropina}
              placeholder="Propina"
              aria-label={`Propina de ${nombre}`}
              className="h-8 pl-6"
            />
          </div>
        )}
        {esMozo && cobra !== undefined && (
          <Badge
            variant={cobra > 0 ? "exito" : "apagado"}
            className="min-w-24 justify-center"
            title="Lo que le toca después del reparto"
          >
            Cobra ${formatearPesos(cobra)}
          </Badge>
        )}
        {whatsapp ? (
          <Button asChild size="icon" variant="outline" className="size-8 text-emerald-600" title="Avisar por WhatsApp">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Avisar a ${nombre} por WhatsApp`}>
              <MessageCircle />
            </a>
          </Button>
        ) : (
          <Button size="icon" variant="outline" className="size-8" disabled title="Este usuario no tiene teléfono cargado">
            <MessageCircle />
          </Button>
        )}
        <Button
          size="icon"
          variant="outline"
          className="text-destructive size-8"
          onClick={quitar}
          disabled={pendiente}
          title="Quitar"
          aria-label={`Quitar a ${nombre} de la convocatoria`}
        >
          {pendiente ? <Loader2 className="animate-spin" /> : <UserMinus />}
        </Button>
      </div>
    </div>
  );
}

// === EQUIPO CONVOCADO DEL DÍA ===
export function SeccionConvocados({
  personal,
  agendas,
  convocados,
  config,
}: {
  personal: Usuario[];
  agendas: Agenda[];
  convocados: Convocado[];
  config: ConfigConvocatoria;
}) {
  const { dia, setDia, propinas, sectores } = usePanel();
  const esMozo = config.modo === "mozos";

  // Igual que antes: solo aparece quien además tiene disponibilidad vigente ese día.
  const filas = personal
    .map((u) => ({
      usuario: u,
      convocado: convocados.find((c) => c.user_name === u.user_name && esConvocadoDelDia(c.dia, dia)),
    }))
    .filter((f): f is { usuario: Usuario; convocado: Convocado } =>
      !!f.convocado && disponibleEseDia(agendas.find((a) => a.user_name === f.usuario.user_name), dia)
    );

  const reparto = repartirPropinasMozos(
    filas.map((f) => ({
      userName: f.usuario.user_name,
      sector: sectores[f.usuario.user_name] ?? f.convocado.sector ?? "Principal",
      juntado: propinas[f.usuario.user_name] ?? f.convocado.propina_individual ?? 0,
    }))
  );
  const nombreDe = (userName: string) => {
    const u = filas.find((f) => f.usuario.user_name === userName)?.usuario;
    return u?.nombre_real || userName;
  };

  return (
    <Seccion
      titulo={esMozo ? "Equipo Convocado" : "Bartenders Convocados"}
      icono={UserCheck}
      tono={esMozo ? "exito" : "barra"}
      acciones={<SelectorDia valor={dia} onCambiar={setDia} />}
    >
      <div id="equipo-convocado" className="grid gap-2">
        {esMozo && (
          <div className="flex justify-end">
            <Badge variant="exito" className="px-3 py-1.5 text-sm">
              Total propinas del día: ${formatearPesos(reparto.total)}
            </Badge>
          </div>
        )}
        {esMozo && filas.length > 0 && (
          <p
            className={cn(
              "flex items-start gap-1.5 text-xs",
              reparto.hayCocina ? "text-muted-foreground" : "text-amber-700 dark:text-primary"
            )}
          >
            <ChefHat className="mt-px size-3.5 shrink-0" />
            {reparto.hayCocina
              ? `El total se reparte entre ${reparto.beneficiarios.map(nombreDe).join(", ")} (Cocina${
                  reparto.beneficiarios.length > 1 ? " y los mozos en $0" : ""
                }).`
              : `Nadie está asignado a ${SECTOR_COCINA}: por ahora cada uno cobra lo que juntó.`}
          </p>
        )}
        {filas.length === 0 ? (
          <TextoVacio>
            {esMozo ? `No seleccionaste personal para trabajar el ${dia} todavía.` : `No hay bartenders convocados para el ${dia}.`}
          </TextoVacio>
        ) : (
          filas.map((f) => (
            <FilaConvocado
              // la key incluye el día: al cambiar de día, la fila arranca con los datos de ese día
              key={`${f.usuario.user_name}-${dia}-${f.convocado.sector}`}
              usuario={f.usuario}
              convocado={f.convocado}
              config={config}
              cobra={esMozo ? reparto.cobra[f.usuario.user_name] : undefined}
            />
          ))
        )}
      </div>
    </Seccion>
  );
}

// === DISPONIBLES PARA CONVOCAR ===
function FilaDisponible({
  usuario,
  agenda,
  estaConvocado,
  config,
}: {
  usuario: Usuario;
  agenda: Agenda;
  estaConvocado: boolean;
  config: ConfigConvocatoria;
}) {
  const { dia } = usePanel();
  const [pendiente, iniciar] = useTransition();
  const esMozo = config.modo === "mozos";

  function alternar() {
    iniciar(async () => {
      const r = await alternarConvocatoria(usuario.user_name, dia, estaConvocado);
      if (r.ok) {
        toast.success(
          estaConvocado
            ? esMozo ? "Personal removido de la convocatoria." : "Bartender removido de la convocatoria."
            : esMozo ? "Personal convocado con éxito." : "Bartender convocado con éxito."
        );
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-bold">
          {usuario.nombre_real || usuario.user_name}
          {esMozo && <span className="text-muted-foreground ml-1 text-xs font-normal">({usuario.rol})</span>}
        </p>
        <p className={cn("text-sm", agenda.observaciones ? "text-amber-700 dark:text-primary" : "text-muted-foreground")}>
          {agenda.observaciones ? `Nota: ${agenda.observaciones}` : "Sin observaciones."}
        </p>
      </div>
      <Button
        size="sm"
        onClick={alternar}
        disabled={pendiente}
        variant={estaConvocado ? "default" : "outline"}
        className={cn("shrink-0 font-bold", estaConvocado && (esMozo ? "bg-exito text-black hover:bg-exito/90" : "bg-barra text-black hover:bg-barra/90"))}
      >
        {pendiente ? <Loader2 className="animate-spin" /> : estaConvocado ? <UserCheck /> : <UserPlus />}
        {estaConvocado ? "Convocado" : "Seleccionar"}
      </Button>
    </div>
  );
}

export function SeccionDisponibles({
  personal,
  agendas,
  convocados,
  config,
}: {
  personal: Usuario[];
  agendas: Agenda[];
  convocados: Convocado[];
  config: ConfigConvocatoria;
}) {
  const { dia } = usePanel();
  const esMozo = config.modo === "mozos";
  const disponibles = personal
    .map((u) => ({ usuario: u, agenda: agendas.find((a) => a.user_name === u.user_name) }))
    .filter((f): f is { usuario: Usuario; agenda: Agenda } => disponibleEseDia(f.agenda, dia));

  return (
    <Seccion
      titulo={esMozo ? "Disponibilidad en Agenda" : "Bartenders Disponibles para Convocar"}
      icono={Users}
      tono={esMozo ? "oro" : "barra"}
      descripcion={esMozo ? `Seleccioná qué mozos van a trabajar el ${dia}.` : `Bartenders con disponibilidad para el ${dia}.`}
    >
      <div className="grid gap-2">
        {disponibles.length === 0 ? (
          <TextoVacio>Nadie marcó disponibilidad para el {dia}.</TextoVacio>
        ) : (
          disponibles.map((f) => (
            <FilaDisponible
              key={f.usuario.user_name}
              usuario={f.usuario}
              agenda={f.agenda}
              estaConvocado={convocados.some((c) => c.user_name === f.usuario.user_name && esConvocadoDelDia(c.dia, dia))}
              config={config}
            />
          ))
        )}
      </div>
    </Seccion>
  );
}
