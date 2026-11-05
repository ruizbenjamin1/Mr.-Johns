"use client";

import { exportarMozos } from "@/app/acciones/convocatoria";
import { BotonExportar } from "@/components/panel/boton-exportar";
import { usePanel } from "@/components/panel/convocatoria";

export function ExportarMozos() {
  const { dia, propinas } = usePanel();
  return <BotonExportar exportar={() => exportarMozos(dia, propinas)} />;
}
