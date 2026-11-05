import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase que corre SOLO en el servidor (Server Actions / páginas).
// Usa la misma clave publishable que el sistema viejo: la seguridad sigue
// estando en las funciones RPC, que validan el token y el rol de cada usuario.
export function crearClienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example)."
    );
  }
  return createClient(url, clave, { auth: { persistSession: false } });
}
