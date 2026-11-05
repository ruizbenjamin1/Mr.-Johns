"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { interpretarStockConIA } from "@/app/acciones/ia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parsearNumeroDecimal, sanearDecimal } from "@/lib/numeros";
import type { ValoresStock } from "@/lib/tipos";

type Columna = "inicial" | "final";
type Fila = { producto: string; cantidad: string; textoOriginal: string; incluir: boolean };

// Reconocimiento de voz del navegador (Chrome en Android, Safari en iPhone).
// Si no existe, queda el micrófono del teclado del celular, que escribe en el cuadro.
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Clase ? new Clase() : null;
}

/** Achica la foto antes de mandarla: viaja más rápido y alcanza para leerla. */
async function prepararFoto(archivo: File): Promise<{ base64: string; vista: string }> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, error) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => error(new Error("No se pudo leer la foto"));
      i.src = url;
    });
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const vista = canvas.toDataURL("image/jpeg", 0.8);
    return { base64: vista.split(",")[1], vista };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CargaIA({
  barra,
  columnaSugerida,
  valores,
  onAplicar,
}: {
  barra: string;
  columnaSugerida: Columna;
  valores: ValoresStock;
  onAplicar: (items: { producto: string; cantidad: string }[], columna: Columna) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [columna, setColumna] = useState<Columna>(columnaSugerida);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<{ base64: string; vista: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [noReconocidos, setNoReconocidos] = useState<{ texto: string; motivo: string }[]>([]);
  const [escuchando, setEscuchando] = useState(false);
  const [hayMicrofono, setHayMicrofono] = useState(false);
  const reconocedor = useRef<Reconocedor | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detección única del navegador al montar
    setHayMicrofono(!!crearReconocedor());
    return () => reconocedor.current?.stop();
  }, []);

  function abrir() {
    setColumna(columnaSugerida);
    setAbierto(true);
  }

  function cerrar() {
    reconocedor.current?.stop();
    setAbierto(false);
    setTexto("");
    setFoto(null);
    setFilas(null);
    setNoReconocidos([]);
  }

  function alternarMicrofono() {
    if (escuchando) {
      reconocedor.current?.stop();
      return;
    }
    const r = crearReconocedor();
    if (!r) return;
    r.lang = "es-AR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let nuevo = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) nuevo += e.results[i][0].transcript;
      }
      if (nuevo.trim()) setTexto((t) => (t.trim() ? `${t.trim()}, ${nuevo.trim()}` : nuevo.trim()));
    };
    r.onend = () => setEscuchando(false);
    r.onerror = (e) => {
      setEscuchando(false);
      if (e.error === "not-allowed") toast.error("Dale permiso al micrófono para dictar.");
    };
    reconocedor.current = r;
    r.start();
    setEscuchando(true);
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      setFoto(await prepararFoto(archivo));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la foto");
    }
  }

  async function interpretar() {
    reconocedor.current?.stop();
    setProcesando(true);
    const r = await interpretarStockConIA(
      { texto, imagen: foto ? { base64: foto.base64, tipo: "image/jpeg" } : undefined },
      columna
    );
    setProcesando(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setFilas(
      r.datos.items.map((i) => ({
        producto: i.producto,
        cantidad: String(i.cantidad).replace(".", ","),
        textoOriginal: i.textoOriginal,
        incluir: true,
      }))
    );
    setNoReconocidos(r.datos.noReconocidos);
    if (r.datos.items.length === 0) toast.error("No se reconoció ningún producto. Probá decirlo de otra forma.");
  }

  function aplicar() {
    const elegidos = (filas ?? [])
      .filter((f) => f.incluir && f.cantidad.trim() !== "")
      .map((f) => ({ producto: f.producto, cantidad: sanearDecimal(f.cantidad) }));
    if (elegidos.length === 0) return;
    onAplicar(elegidos, columna);
    toast.success(
      `Se cargaron ${elegidos.length} ${elegidos.length === 1 ? "producto" : "productos"} en la columna ${columna === "inicial" ? "Inicial" : "Final"}.`
    );
    cerrar();
  }

  if (!abierto) {
    return (
      <Button variant="outline" onClick={abrir} disabled={!barra} className="w-full font-bold">
        <Sparkles className="text-amber-600 dark:text-primary" />
        {barra ? "Cargar con IA (dictado, texto o foto)" : "Elegí una barra para cargar con IA"}
      </Button>
    );
  }

  const elegidos = (filas ?? []).filter((f) => f.incluir).length;

  return (
    <Card className="border-primary/40 gap-3 p-3 shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-amber-600 dark:text-primary" />
          Cargar {barra} con IA
        </h3>
        <Button variant="ghost" size="icon" onClick={cerrar} aria-label="Cerrar carga con IA" className="size-8">
          <X />
        </Button>
      </div>

      <Tabs value={columna} onValueChange={(v) => setColumna(v as Columna)}>
        <TabsList className="w-full">
          <TabsTrigger value="inicial">Columna Inicial</TabsTrigger>
          <TabsTrigger value="final">Columna Final</TabsTrigger>
        </TabsList>
      </Tabs>

      {filas === null ? (
        <>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder={'Dictá o escribí, por ejemplo: "fernet de 750 siete, gin bombay tres, red bull doce". También podés pegar el mensaje de WhatsApp.'}
            aria-label="Conteo dictado o escrito"
          />
          <div className="grid grid-cols-2 gap-2">
            {hayMicrofono ? (
              <Button variant={escuchando ? "destructive" : "outline"} onClick={alternarMicrofono}>
                {escuchando ? <MicOff /> : <Mic />}
                {escuchando ? "Parar" : "Dictar"}
              </Button>
            ) : (
              <p className="text-muted-foreground self-center text-xs">
                Para dictar, usá el micrófono del teclado del celular.
              </p>
            )}
            <Button variant="outline" onClick={() => inputFoto.current?.click()}>
              <Camera />
              {foto ? "Cambiar foto" : "Sacar foto"}
            </Button>
            <input ref={inputFoto} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegirFoto} />
          </div>
          {escuchando && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600" aria-live="polite">
              <span className="size-2 animate-pulse rounded-full bg-red-600" /> Escuchando... decí producto y cantidad.
            </p>
          )}
          {foto && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local de la foto */}
              <img src={foto.vista} alt="Foto del conteo" className="max-h-48 w-full rounded-md border object-contain" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 size-7"
                onClick={() => setFoto(null)}
                aria-label="Sacar la foto"
              >
                <X />
              </Button>
            </div>
          )}
          <Button onClick={interpretar} disabled={procesando || (!texto.trim() && !foto)} className="font-bold">
            {procesando ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {procesando ? "Interpretando..." : "Interpretar"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            Revisá lo que entendió la IA antes de cargarlo. Podés corregir cantidades o destildar lo que no va.
          </p>
          <div className="grid gap-1.5">
            {filas.map((f, i) => {
              const anterior = valores[f.producto]?.[columna] ?? "";
              const pisa = anterior !== "" && parsearNumeroDecimal(anterior) !== parsearNumeroDecimal(f.cantidad);
              return (
                <label
                  key={f.producto}
                  className="bg-muted/30 flex items-center gap-2 rounded-md border px-2 py-1.5 has-[input[type=checkbox]:not(:checked)]:opacity-50"
                >
                  <input
                    type="checkbox"
                    checked={f.incluir}
                    onChange={(e) => setFilas((fs) => fs!.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))}
                    className="accent-primary size-4 shrink-0"
                    aria-label={`Cargar ${f.producto}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{f.producto}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      &quot;{f.textoOriginal}&quot;{pisa && ` · antes: ${anterior}`}
                    </span>
                  </span>
                  <Input
                    inputMode="decimal"
                    value={f.cantidad}
                    onChange={(e) =>
                      setFilas((fs) => fs!.map((x, j) => (j === i ? { ...x, cantidad: sanearDecimal(e.target.value) } : x)))
                    }
                    aria-label={`Cantidad de ${f.producto}`}
                    className="h-8 w-20 text-center"
                  />
                </label>
              );
            })}
          </div>
          {noReconocidos.length > 0 && (
            <div className="grid gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-primary">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-3.5" /> No se cargó (completalo a mano):
              </p>
              {noReconocidos.map((n, i) => (
                <p key={i}>
                  &quot;{n.texto}&quot;: {n.motivo}
                </p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setFilas(null)}>
              Volver
            </Button>
            <Button onClick={aplicar} disabled={elegidos === 0} className="font-bold">
              <Check />
              Cargar {elegidos}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
