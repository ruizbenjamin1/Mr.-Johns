import "server-only";
import { crearClienteSupabase } from "./supabase";
import { obtenerSesion, type Sesion } from "./sesion";
import { esRolAdmin, esRolJefeBarra } from "./roles";
import { obtenerLunesSemanaActual } from "./turno";
import type { Agenda, Convocado, Resultado, Usuario } from "./tipos";

// Capa de datos del servidor. Antes cada página hablaba con Supabase desde
// el navegador y mandaba el token guardado en sessionStorage; ahora el token
// vive en la cookie httpOnly y solo este código lo usa.

export class ErrorDeAcceso extends Error {}

/** Sesión obligatoria; si se pasa un filtro de rol, también lo exige. */
export async function exigirSesion(permitido?: (rol: string) => boolean): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new ErrorDeAcceso("Tu sesión expiró. Volvé a iniciar sesión.");
  if (permitido && !permitido(sesion.rol)) {
    throw new ErrorDeAcceso("No tenés permiso para hacer esto.");
  }
  return sesion;
}

export const soloAdmin = (rol: string) => esRolAdmin(rol);
export const adminOJefeBarra = (rol: string) => esRolAdmin(rol) || esRolJefeBarra(rol);

/** Llama a una RPC agregándole el token de la sesión como p_token. */
export async function llamarRpc<T = unknown>(
  sesion: Sesion,
  nombre: string,
  parametros: Record<string, unknown> = {}
): Promise<T> {
  const supabase = crearClienteSupabase();
  const { data, error } = await supabase.rpc(nombre, { p_token: sesion.token, ...parametros });
  if (error) {
    console.error(`Error en la RPC ${nombre}:`, error);
    throw new Error(error.message || `Falló ${nombre}`);
  }
  return data as T;
}

/** Envuelve una acción para devolver { ok, error } en vez de tirar excepciones al cliente. */
export async function capturar<T>(accion: () => Promise<T>, mensajeError: string): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await accion() };
  } catch (err) {
    if (err instanceof ErrorDeAcceso) return { ok: false, error: err.message };
    console.error(mensajeError, err);
    const detalle = err instanceof Error && err.message ? `: ${err.message}` : "";
    return { ok: false, error: `${mensajeError}${detalle}` };
  }
}

// === LECTURAS ===
// La vista "usuarios_public" no incluye pass_hash; la tabla real "usuarios"
// no es accesible con la clave publishable.

export async function leerUsuarios(): Promise<Usuario[]> {
  const supabase = crearClienteSupabase();
  const { data, error } = await supabase
    .from("usuarios_public")
    .select("user_name, nombre_real, rol, telefono");
  if (error) throw error;
  return (data as Usuario[]) || [];
}

export async function leerUsuario(userName: string): Promise<Usuario | null> {
  const supabase = crearClienteSupabase();
  const { data, error } = await supabase
    .from("usuarios_public")
    .select("user_name, nombre_real, rol, telefono")
    .eq("user_name", userName.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return (data as Usuario) || null;
}

export async function leerAgendas(): Promise<Agenda[]> {
  const supabase = crearClienteSupabase();
  const { data, error } = await supabase.from("agendas").select("*");
  if (error) throw error;
  return (data as Agenda[]) || [];
}

export async function leerAgenda(userName: string): Promise<Agenda | null> {
  const supabase = crearClienteSupabase();
  const { data, error } = await supabase
    .from("agendas")
    .select("*")
    .eq("user_name", userName.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return (data as Agenda) || null;
}

/**
 * Convocados de la semana actual. Filtrar por semana evita que un "Viernes"
 * de hace un mes se mezcle con el de hoy.
 */
export async function leerConvocadosSemana(userName?: string): Promise<Convocado[]> {
  const supabase = crearClienteSupabase();
  let consulta = supabase.from("convocados").select("*").eq("semana_lunes", obtenerLunesSemanaActual());
  if (userName) consulta = consulta.eq("user_name", userName.toLowerCase().trim());
  const { data, error } = await consulta;
  if (error) throw error;
  return (data as Convocado[]) || [];
}
