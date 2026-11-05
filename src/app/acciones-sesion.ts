"use server";

import { redirect } from "next/navigation";
import { crearClienteSupabase } from "@/lib/supabase";
import { borrarSesion, guardarSesion, obtenerSesion } from "@/lib/sesion";
import { rutaInicioPorRol } from "@/lib/roles";

export type EstadoLogin = { error: string | null };

type FilaLogin = {
  user_name: string;
  rol: string;
  token: string;
  nombre_real?: string | null;
};

// Login: llama a la misma RPC "verificar_login" de antes, pero desde el
// servidor. La contraseña se compara con el hash dentro de Supabase.
export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const usuario = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!usuario || !password) {
    return { error: "Por favor, completá todos los campos." };
  }

  let fila: FilaLogin | null = null;
  try {
    const supabase = crearClienteSupabase();
    const { data, error } = await supabase.rpc("verificar_login", {
      p_user_name: usuario,
      p_pass: password,
    });
    if (error) {
      console.error("Error en verificar_login:", error);
      return { error: "Ocurrió un error al consultar la base de datos." };
    }
    fila = (data as FilaLogin[] | null)?.[0] ?? null;
  } catch (err) {
    console.error("Error crítico en el login:", err);
    return { error: "No se pudo conectar con el servidor." };
  }

  if (!fila) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  await guardarSesion({
    usuario: fila.user_name,
    nombre: fila.nombre_real || fila.user_name,
    rol: fila.rol,
    token: fila.token,
  });

  // redirect() corta la ejecución: va fuera del try/catch a propósito.
  redirect(rutaInicioPorRol(fila.rol));
}

// Logout: invalida el token en Supabase y borra la cookie.
export async function cerrarSesion() {
  const sesion = await obtenerSesion();
  if (sesion) {
    try {
      const supabase = crearClienteSupabase();
      await supabase.rpc("cerrar_sesion", { p_token: sesion.token });
    } catch (err) {
      // Aunque falle la RPC, la cookie se borra igual y el usuario sale.
      console.error("Error al cerrar sesión en Supabase:", err);
    }
  }
  await borrarSesion();
  redirect("/");
}
