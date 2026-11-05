"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudOff, Loader2, Search, Send } from "lucide-react";
import { EsqueletoTabla } from "@/components/esqueletos";
import { toast } from "sonner";
import { enviarStockFinal, enviarStockInicial, guardarProgresoStock, obtenerProgresoStock } from "@/app/acciones/stock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sanearDecimal } from "@/lib/numeros";
import { CargaIA } from "./carga-ia";
import { anotarCambio, borrarRespaldo, combinarConRespaldo, leerRespaldo } from "@/lib/respaldo-stock";
import { BARRAS_STOCK, PRODUCTOS_STOCK } from "@/lib/stock";
import type { ValoresStock } from "@/lib/tipos";

const COOLDOWN_INICIAL_MS = 5 * 60 * 1000; // 5 minutos entre reenvíos del Inicial
const CLAVE_ULTIMA_BARRA = "ultimaBarraStockDispositivo";

// Recordatorio de comodidad (la fuente de verdad es Supabase): la última barra
// usada desde este dispositivo se preselecciona. localStorage puede fallar en
// modo privado, por eso todo va con try/catch.
function leerUltimaBarra(): string {
  try {
    const barra = localStorage.getItem(CLAVE_ULTIMA_BARRA) || "";
    return (BARRAS_STOCK as readonly string[]).includes(barra) ? barra : "";
  } catch {
    return "";
  }
}

function recordarBarra(barra: string) {
  try {
    if (barra) localStorage.setItem(CLAVE_ULTIMA_BARRA, barra);
    else localStorage.removeItem(CLAVE_ULTIMA_BARRA);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error";

type DatosConteo = {
  barra: string;
  responsable: string;
  valores: ValoresStock;
  inicialEnviado: boolean;
  timestampInicial: string | null;
};

const DEMORA_GUARDADO_MS = 600; // espera tras la última tecla antes de mandar al servidor
const REINTENTO_MS = 5000; // si falló el guardado, cada cuánto se reintenta

export function ConteoStock({ iaDisponible = false }: { iaDisponible?: boolean }) {
  const [barra, setBarra] = useState("");
  const [responsable, setResponsable] = useState("");
  const [valores, setValores] = useState<ValoresStock>({});
  const [inicialEnviado, setInicialEnviado] = useState(false);
  const [timestampInicial, setTimestampInicial] = useState<string | null>(null);
  const [cargandoBarra, setCargandoBarra] = useState(false);
  const [enviando, setEnviando] = useState<"inicial" | "final" | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("guardado");
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Lo que se ve en pantalla, siempre al día, para los guardados que corren
  // fuera de React (temporizadores, cierre de la app).
  const datos = useRef<DatosConteo>({ barra: "", responsable: "", valores: {}, inicialEnviado: false, timestampInicial: null });
  // Cada cambio suma 1 a "version"; "versionGuardada" es la última que el servidor confirmó.
  const version = useRef(0);
  const versionGuardada = useRef(0);
  const guardando = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function actualizarDatos(cambios: Partial<DatosConteo>) {
    datos.current = { ...datos.current, ...cambios };
  }

  const hayPendientes = () => version.current !== versionGuardada.current;

  // Manda el conteo al servidor. Si falla (sin internet, sesión vencida), los
  // cambios siguen en el respaldo del celular y se reintenta solo.
  const guardarAhora = useCallback(async (): Promise<boolean> => {
    if (temporizador.current) clearTimeout(temporizador.current);
    const d = datos.current;
    if (!d.barra || !hayPendientes()) return true;
    if (guardando.current) {
      // Hay un guardado en curso: se vuelve a intentar apenas termine.
      temporizador.current = setTimeout(() => void guardarAhora(), DEMORA_GUARDADO_MS);
      return false;
    }
    const versionEnviada = version.current;
    guardando.current = true;
    setEstadoGuardado("guardando");
    const r = await guardarProgresoStock(d.barra, d.responsable, d.valores, d.inicialEnviado, d.timestampInicial);
    guardando.current = false;

    if (r.ok) {
      versionGuardada.current = Math.max(versionGuardada.current, versionEnviada);
      setErrorGuardado(null);
      if (!hayPendientes()) {
        borrarRespaldo(d.barra);
        setEstadoGuardado("guardado");
      } else {
        // Escribieron mientras se guardaba: falta mandar lo último.
        setEstadoGuardado("pendiente");
        temporizador.current = setTimeout(() => void guardarAhora(), DEMORA_GUARDADO_MS);
      }
      return true;
    }
    setEstadoGuardado("error");
    setErrorGuardado(r.error);
    temporizador.current = setTimeout(() => void guardarAhora(), REINTENTO_MS);
    return false;
  }, []);

  function programarGuardado() {
    version.current += 1;
    setEstadoGuardado((e) => (e === "error" ? e : "pendiente"));
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardarAhora(), DEMORA_GUARDADO_MS);
  }

  // Trae el progreso compartido de la barra y le suma lo que haya quedado
  // pendiente en este celular (por ejemplo, si cerraron la app antes de que se guardara).
  const cargarBarra = useCallback(
    async (nuevaBarra: string) => {
      setValores({});
      setInicialEnviado(false);
      setTimestampInicial(null);
      setEstadoGuardado("guardado");
      setErrorGuardado(null);
      version.current = 0;
      versionGuardada.current = 0;
      actualizarDatos({ barra: nuevaBarra, valores: {}, inicialEnviado: false, timestampInicial: null });
      if (!nuevaBarra) return;

      setCargandoBarra(true);
      const r = await obtenerProgresoStock(nuevaBarra);
      setCargandoBarra(false);
      if (datos.current.barra !== nuevaBarra) return; // cambiaron de barra mientras cargaba

      const respaldo = leerRespaldo(nuevaBarra);
      if (!r.ok && !respaldo) {
        toast.error(r.error);
        return;
      }
      const servidor = {
        responsable: (r.ok && r.datos?.responsable) || datos.current.responsable,
        valores: (r.ok && r.datos?.valores) || {},
      };
      const combinado = combinarConRespaldo(servidor, respaldo);
      const enviado = r.ok ? !!r.datos?.inicial_enviado : false;
      const momento = r.ok ? (r.datos?.timestamp_inicial ?? null) : null;

      setValores(combinado.valores);
      setResponsable(combinado.responsable);
      setInicialEnviado(enviado);
      setTimestampInicial(momento);
      actualizarDatos({ responsable: combinado.responsable, valores: combinado.valores, inicialEnviado: enviado, timestampInicial: momento });

      if (combinado.recuperados > 0) {
        toast.info(
          `Se recuperaron ${combinado.recuperados} ${combinado.recuperados === 1 ? "dato" : "datos"} que habían quedado sin guardar en este celular.`
        );
        programarGuardado();
      } else if (respaldo) {
        borrarRespaldo(nuevaBarra); // el servidor ya tenía todo
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- programarGuardado solo usa refs
    []
  );

  // Al abrir: preselecciona la última barra de este dispositivo.
  useEffect(() => {
    const ultima = leerUltimaBarra();
    if (ultima) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar
      setBarra(ultima);
      void cargarBarra(ultima);
    }
  }, [cargarBarra]);

  // Si la app pasa a segundo plano o se cierra con cambios sin guardar, se
  // mandan con sendBeacon, que el navegador completa aunque la página se cierre.
  // (El respaldo del celular igual queda, por si tampoco llegara.)
  useEffect(() => {
    function alSalir() {
      if (!hayPendientes() || !datos.current.barra) return;
      if (temporizador.current) clearTimeout(temporizador.current);
      try {
        const cuerpo = new Blob([JSON.stringify(datos.current)], { type: "application/json" });
        navigator.sendBeacon("/api/stock-progreso", cuerpo);
      } catch {
        /* sin sendBeacon: queda el respaldo del celular */
      }
    }
    function alCambiarVisibilidad() {
      if (document.visibilityState === "hidden") alSalir();
      // Al volver a la app, si quedó algo pendiente se reintenta enseguida.
      else if (hayPendientes()) void guardarAhora();
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", alSalir);
    window.addEventListener("online", guardarAhora);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", alSalir);
      window.removeEventListener("online", guardarAhora);
    };
  }, [guardarAhora]);

  // Reloj para la cuenta regresiva del Inicial.
  useEffect(() => {
    if (!inicialEnviado) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [inicialEnviado]);

  async function cambiarBarra(nueva: string) {
    // Antes de cambiar, se manda lo pendiente de la barra actual.
    // Si no se puede, queda en el respaldo del celular de esa barra.
    if (hayPendientes()) await guardarAhora();
    setBarra(nueva);
    recordarBarra(nueva);
    void cargarBarra(nueva);
  }

  function cambiarValor(producto: string, campo: "inicial" | "final", texto: string) {
    const limpio = sanearDecimal(texto);
    const valor = { inicial: valores[producto]?.inicial ?? "", final: valores[producto]?.final ?? "", [campo]: limpio };
    const nuevos = { ...valores, [producto]: valor };
    setValores(nuevos);
    actualizarDatos({ valores: nuevos });
    if (barra) {
      anotarCambio(barra, { producto, valor });
      programarGuardado();
    }
  }

  // Carga varios productos de una vez (lo que confirmó el bartender en "Cargar con IA").
  function aplicarValores(items: { producto: string; cantidad: string }[], columna: "inicial" | "final") {
    if (!barra || items.length === 0) return;
    const nuevos = { ...valores };
    for (const { producto, cantidad } of items) {
      const valor = { inicial: nuevos[producto]?.inicial ?? "", final: nuevos[producto]?.final ?? "", [columna]: cantidad };
      nuevos[producto] = valor;
      anotarCambio(barra, { producto, valor });
    }
    setValores(nuevos);
    actualizarDatos({ valores: nuevos });
    programarGuardado();
  }

  function cambiarResponsable(texto: string) {
    setResponsable(texto);
    actualizarDatos({ responsable: texto });
    if (barra) {
      anotarCambio(barra, { responsable: texto });
      programarGuardado();
    }
  }

  function validar(): boolean {
    if (!barra || !responsable.trim()) {
      toast.error("Por favor, completá la barra y el responsable.");
      return false;
    }
    return true;
  }

  async function enviarInicial() {
    if (!validar()) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    const versionEnviada = version.current;
    setEnviando("inicial");
    const r = await enviarStockInicial(barra, responsable, valores);
    setEnviando(null);
    if (r.ok) {
      // El Inicial también guarda el progreso en el servidor.
      versionGuardada.current = Math.max(versionGuardada.current, versionEnviada);
      if (!hayPendientes()) {
        borrarRespaldo(barra);
        setEstadoGuardado("guardado");
      }
      setInicialEnviado(true);
      setTimestampInicial(r.datos.timestampInicial);
      actualizarDatos({ inicialEnviado: true, timestampInicial: r.datos.timestampInicial });
      setAhora(new Date(r.datos.timestampInicial).getTime());
      toast.success("Inicial enviado y confirmado por la planilla. Ya podés cargar el Final cuando termine el turno.");
    } else {
      toast.error(r.error, { action: { label: "Reintentar", onClick: enviarInicial }, duration: 10000 });
    }
  }

  async function enviarFinal() {
    if (!validar()) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    setEnviando("final");
    const r = await enviarStockFinal(barra, responsable, valores);
    setEnviando(null);
    if (r.ok) {
      toast.success("Planilla cerrada: el Final llegó bien.");
      borrarRespaldo(barra);
      version.current = 0;
      versionGuardada.current = 0;
      setEstadoGuardado("guardado");
      setValores({});
      setInicialEnviado(false);
      setTimestampInicial(null);
      actualizarDatos({ valores: {}, inicialEnviado: false, timestampInicial: null });
    } else {
      // Si falla, el progreso NO se borra: se puede reintentar con los mismos números.
      toast.error(r.error, { action: { label: "Reintentar", onClick: enviarFinal }, duration: 10000 });
    }
  }

  const restante = inicialEnviado
    ? Math.max(0, COOLDOWN_INICIAL_MS - (ahora - (timestampInicial ? new Date(timestampInicial).getTime() : 0)))
    : 0;
  const cuentaRegresiva = `${Math.floor(restante / 60000)}:${String(Math.floor((restante % 60000) / 1000)).padStart(2, "0")}`;
  const textoEstado = !inicialEnviado
    ? "Cargá el stock inicial y enviá primero el Inicial. El botón Final se habilita después."
    : restante > 0
      ? `Inicial enviado. Podés reenviarlo en ${cuentaRegresiva} si te equivocaste, o cargar el Final cuando termine el turno.`
      : "Inicial ya enviado. Podés reenviarlo si te equivocaste, o cargar el Final cuando termine el turno.";

  const texto = busqueda.toLowerCase().trim();
  const productos = PRODUCTOS_STOCK.filter(
    (p) => !texto || p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto)
  );

  return (
    <div className="grid gap-3">
      <Card className="grid gap-3 p-3 shadow-none sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="select-barra" className="text-amber-700 dark:text-primary font-bold">
            Seleccionar Barra:
          </Label>
          <NativeSelect id="select-barra" value={barra} onChange={(e) => cambiarBarra(e.target.value)}>
            <option value="">-- Seleccioná una barra --</option>
            {BARRAS_STOCK.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="input-nombre-stock" className="text-amber-700 dark:text-primary font-bold">
            Nombre del Responsable:
          </Label>
          <Input
            id="input-nombre-stock"
            value={responsable}
            onChange={(e) => cambiarResponsable(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
      </Card>

      {barra && !cargandoBarra && (
        <p
          aria-live="polite"
          className={
            estadoGuardado === "error"
              ? "flex items-start gap-1.5 text-xs font-semibold text-amber-700 dark:text-primary"
              : "text-muted-foreground flex items-center gap-1.5 text-xs"
          }
        >
          {estadoGuardado === "guardado" && (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-exito" />
              Conteo de {barra} guardado.
            </>
          )}
          {(estadoGuardado === "pendiente" || estadoGuardado === "guardando") && (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Guardando...
            </>
          )}
          {estadoGuardado === "error" && (
            <>
              <CloudOff className="mt-px size-3.5 shrink-0" />
              <span>
                {errorGuardado?.toLowerCase().includes("sesión")
                  ? "Tu sesión venció. Lo que cargaste quedó guardado en este celular: volvé a entrar desde acá y se recupera."
                  : "Sin conexión con el servidor. Lo que cargaste quedó guardado en este celular y se reintenta solo."}
              </span>
            </>
          )}
        </p>
      )}

      {iaDisponible && !cargandoBarra && (
        <CargaIA
          barra={barra}
          columnaSugerida={inicialEnviado ? "final" : "inicial"}
          valores={valores}
          onAplicar={aplicarValores}
        />
      )}

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto en stock..."
          aria-label="Buscar producto en stock"
          className="pl-9"
        />
      </div>

      {cargandoBarra ? (
        <EsqueletoTabla filas={8} columnas={3} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Producto / Insumo</TableHead>
              <TableHead className="w-1/4 text-center">Inicial</TableHead>
              <TableHead className="w-1/4 text-center">Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto, i) => {
              const nuevaCategoria = i === 0 || productos[i - 1].categoria !== producto.categoria;
              const guardado = valores[producto.nombre];
              return (
                <Fragment key={producto.nombre}>
                  {nuevaCategoria && (
                    <TableRow className="bg-secondary hover:bg-secondary">
                      <TableCell colSpan={3} className="font-bold tracking-wide text-amber-700 uppercase dark:text-primary">
                        — {producto.categoria} —
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="whitespace-normal">{producto.nombre}</TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={guardado?.inicial ?? ""}
                        onChange={(e) => cambiarValor(producto.nombre, "inicial", e.target.value)}
                        aria-label={`Inicial de ${producto.nombre}`}
                        className="h-8 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={guardado?.final ?? ""}
                        onChange={(e) => cambiarValor(producto.nombre, "final", e.target.value)}
                        aria-label={`Final de ${producto.nombre}`}
                        className="h-8 text-center"
                      />
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            {productos.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-center">
                  No hay productos que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" variant="outline" onClick={enviarInicial} disabled={!!enviando || restante > 0} className="border-primary font-bold text-amber-700 dark:text-primary">
          {enviando === "inicial" ? <Loader2 className="animate-spin" /> : <Send />}
          ENVIAR INICIAL
        </Button>
        <Button
          size="lg"
          onClick={enviarFinal}
          disabled={!!enviando || !inicialEnviado}
          className="font-bold"
        >
          {enviando === "final" ? <Loader2 className="animate-spin" /> : <Send />}
          ENVIAR FINAL
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs" aria-live="polite">
        {textoEstado}
      </p>
    </div>
  );
}
