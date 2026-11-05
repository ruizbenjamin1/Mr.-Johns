"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BEBIDAS, COMIDAS } from "@/lib/carta";

function Buscador({ valor, onCambiar, placeholder }: { valor: string; onCambiar: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-3">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input value={valor} onChange={(e) => onCambiar(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-9" />
    </div>
  );
}

function TarjetaCarta({ nombre, descripcion, etiqueta }: { nombre: string; descripcion: string; etiqueta?: string | null }) {
  return (
    <Card className="gap-1 p-3 shadow-none">
      <h3 className="text-sm font-bold">{nombre}</h3>
      <p className="text-muted-foreground text-sm">{descripcion}</p>
      {etiqueta && <Badge variant="destructive" className="mt-1">{etiqueta}</Badge>}
    </Card>
  );
}

const coincide = (texto: string, ...campos: string[]) =>
  campos.some((campo) => campo.toLowerCase().includes(texto.toLowerCase().trim()));

export function ListaComidas() {
  const [busqueda, setBusqueda] = useState("");
  const platos = COMIDAS.filter((p) => coincide(busqueda, p.nombre, p.descripcion));
  return (
    <>
      <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar comida por nombre o ingredientes..." />
      <div className="grid gap-2">
        {platos.map((p) => (
          <TarjetaCarta key={p.nombre} {...p} />
        ))}
      </div>
    </>
  );
}

export function ListaBebidas() {
  const [busqueda, setBusqueda] = useState("");
  const bebidas = BEBIDAS.filter((b) => coincide(busqueda, b.nombre, b.descripcion));
  return (
    <>
      <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar bebida por nombre..." />
      <div className="grid gap-2">
        {bebidas.map((b) => (
          <TarjetaCarta key={b.nombre} {...b} />
        ))}
      </div>
    </>
  );
}
