// Números con coma o punto: el teclado numérico de muchos celulares en
// español solo tiene coma, y <input type="number"> exige punto. Por eso los
// campos de stock son de texto con inputMode="decimal" y se interpretan acá.

export function parsearNumeroDecimal(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const numero = parseFloat(String(valor).trim().replace(",", "."));
  return isNaN(numero) ? 0 : numero;
}

/** Deja solo dígitos y un único separador decimal (, o .). */
export function sanearDecimal(valor: string): string {
  let limpio = valor.replace(/[^0-9.,]/g, "");
  const primerSeparador = limpio.search(/[.,]/);
  if (primerSeparador !== -1) {
    limpio =
      limpio.slice(0, primerSeparador + 1) + limpio.slice(primerSeparador + 1).replace(/[.,]/g, "");
  }
  return limpio;
}

export function formatearPesos(monto: number): string {
  return monto.toLocaleString("es-AR");
}

/** Link "click to send" de WhatsApp. null si no hay teléfono cargado. */
export function construirEnlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const soloDigitos = (telefono || "").replace(/\D/g, "");
  if (!soloDigitos) return null;
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}
