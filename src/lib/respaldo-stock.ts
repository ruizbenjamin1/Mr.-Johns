import type { ValoresStock } from "./tipos";

// Respaldo del conteo de stock EN EL CELULAR.
//
// Cada número que se escribe se guarda acá al instante (localStorage es
// sincrónico: sobrevive aunque cierren la app un milisegundo después) y se
// borra recién cuando Supabase confirma que lo recibió. Si se cerró la app,
// se cortó internet o venció la sesión, al volver a abrir esa barra los
// cambios pendientes se recuperan solos.
//
// Solo se guardan los productos que se tocaron desde este celular, no el
// conteo entero: al recuperar, se superponen a lo que hay en el servidor, así
// no se pisa lo que haya cargado otro compañero en la misma barra.

export type RespaldoStock = {
  /** Solo si se cambió el responsable desde este celular. */
  responsable?: string;
  /** Productos tocados desde este celular y todavía no confirmados. */
  cambios: ValoresStock;
  guardadoEn: number;
};

const clave = (barra: string) => `mjStockPendiente:${barra}`;

export function leerRespaldo(barra: string): RespaldoStock | null {
  try {
    const texto = localStorage.getItem(clave(barra));
    if (!texto) return null;
    const datos = JSON.parse(texto) as RespaldoStock;
    if (!datos || typeof datos.cambios !== "object") return null;
    return datos;
  } catch {
    return null;
  }
}

/** Agrega un cambio pendiente al respaldo de la barra. Devuelve false si no se pudo guardar. */
export function anotarCambio(
  barra: string,
  cambio: { producto: string; valor: { inicial: string; final: string } } | { responsable: string }
): boolean {
  try {
    const actual = leerRespaldo(barra) ?? { cambios: {}, guardadoEn: 0 };
    const nuevo: RespaldoStock =
      "producto" in cambio
        ? { ...actual, cambios: { ...actual.cambios, [cambio.producto]: cambio.valor } }
        : { ...actual, responsable: cambio.responsable };
    nuevo.guardadoEn = Date.now();
    localStorage.setItem(clave(barra), JSON.stringify(nuevo));
    return true;
  } catch {
    return false; // modo privado o almacenamiento lleno: se sigue guardando en el servidor igual
  }
}

export function borrarRespaldo(barra: string) {
  try {
    localStorage.removeItem(clave(barra));
  } catch {
    /* nada que hacer */
  }
}

/** Superpone los cambios pendientes del celular sobre lo que vino del servidor. */
export function combinarConRespaldo(
  servidor: { responsable: string; valores: ValoresStock },
  respaldo: RespaldoStock | null
): { responsable: string; valores: ValoresStock; recuperados: number } {
  if (!respaldo) return { ...servidor, recuperados: 0 };
  const productos = Object.keys(respaldo.cambios);
  const cambioResponsable = respaldo.responsable !== undefined && respaldo.responsable !== servidor.responsable;
  return {
    responsable: respaldo.responsable ?? servidor.responsable,
    valores: { ...servidor.valores, ...respaldo.cambios },
    recuperados: productos.filter((p) => {
      const enServidor = servidor.valores[p];
      const local = respaldo.cambios[p];
      return !enServidor || enServidor.inicial !== local.inicial || enServidor.final !== local.final;
    }).length + (cambioResponsable ? 1 : 0),
  };
}
