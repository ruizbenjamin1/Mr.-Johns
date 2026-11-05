"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { DIAS_SEMANA } from "@/lib/turno";

export function SelectorDia({ valor, onCambiar }: { valor: string; onCambiar: (dia: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-muted-foreground">Día:</span>
      <div className="w-36">
        <NativeSelect value={valor} onChange={(e) => onCambiar(e.target.value)} className="font-bold">
          {DIAS_SEMANA.map((dia) => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </NativeSelect>
      </div>
    </label>
  );
}
