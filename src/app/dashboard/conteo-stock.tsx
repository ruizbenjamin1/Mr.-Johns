"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { enviarStockFinal, enviarStockInicial, guardarProgresoStock, obtenerProgresoStock } from "@/app/acciones/stock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sanearDecimal } from "@/lib/numeros";
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

export function ConteoStock() {
  const [barra, setBarra] = useState("");
  const [responsable, setResponsable] = useState("");
  const [valores, setValores] = useState<ValoresStock>({});
  const [inicialEnviado, setInicialEnviado] = useState(false);
  const [timestampInicial, setTimestampInicial] = useState<string | null>(null);
  const [cargandoBarra, setCargandoBarra] = useState(false);
  const [enviando, setEnviando] = useState<"inicial" | "final" | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trae el progreso compartido de la barra elegida.
  const cargarBarra = useCallback(async (nuevaBarra: string) => {
    setValores({});
    setInicialEnviado(false);
    setTimestampInicial(null);
    if (!nuevaBarra) return;
    setCargandoBarra(true);
    const r = await obtenerProgresoStock(nuevaBarra);
    setCargandoBarra(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    if (r.datos) {
      setValores(r.datos.valores || {});
      if (r.datos.responsable) setResponsable(r.datos.responsable);
      setInicialEnviado(!!r.datos.inicial_enviado);
      setTimestampInicial(r.datos.timestamp_inicial);
    }
  }, []);

  // Al abrir: preselecciona la última barra de este dispositivo.
  useEffect(() => {
    const ultima = leerUltimaBarra();
    if (ultima) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar
      setBarra(ultima);
      void cargarBarra(ultima);
    }
  }, [cargarBarra]);

  // Reloj para la cuenta regresiva del Inicial.
  useEffect(() => {
    if (!inicialEnviado) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [inicialEnviado]);

  // Guardado con demora: cada tecla no tiene que ser un viaje a la red.
  function programarGuardado(datos: { responsable: string; valores: ValoresStock }) {
    if (!barra) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      void guardarProgresoStock(barra, datos.responsable, datos.valores, inicialEnviado, timestampInicial);
    }, 800);
  }

  function cambiarBarra(nueva: string) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setBarra(nueva);
    recordarBarra(nueva);
    void cargarBarra(nueva);
  }

  function cambiarValor(producto: string, campo: "inicial" | "final", texto: string) {
    const limpio = sanearDecimal(texto);
    const nuevos = {
      ...valores,
      [producto]: { inicial: valores[producto]?.inicial ?? "", final: valores[producto]?.final ?? "", [campo]: limpio },
    };
    setValores(nuevos);
    programarGuardado({ responsable, valores: nuevos });
  }

  function cambiarResponsable(texto: string) {
    setResponsable(texto);
    programarGuardado({ responsable: texto, valores });
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
    setEnviando("inicial");
    const r = await enviarStockInicial(barra, responsable, valores);
    setEnviando(null);
    if (r.ok) {
      setInicialEnviado(true);
      setTimestampInicial(r.datos.timestampInicial);
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
      setValores({});
      setInicialEnviado(false);
      setTimestampInicial(null);
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
        <p className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando el conteo de {barra}...
        </p>
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
