"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { adminOJefeBarra, capturar, exigirSesion, llamarRpc, soloAdmin } from "@/lib/datos";
import { esRolAdmin } from "@/lib/roles";

// Alta, edición y baja de usuarios. Las contraseñas las hashea Supabase
// dentro de las RPC: nunca se guardan ni se muestran en texto plano.

type DatosUsuario = {
  nombre: string;
  usuario: string;
  password: string;
  telefono: string;
  rol: string;
};

/** El jefe de barra solo puede dar de alta y editar bartenders. */
async function exigirPermisoSobreRol(rol: string) {
  const sesion = await exigirSesion(adminOJefeBarra);
  if (!esRolAdmin(sesion.rol) && rol !== "bartender") {
    throw new Error("Solo un administrador puede asignar ese rol");
  }
  return sesion;
}

export async function crearUsuario(datos: DatosUsuario) {
  return capturar(async () => {
    const sesion = await exigirPermisoSobreRol(datos.rol);
    const usuario = datos.usuario.trim().toLowerCase();
    if (!usuario || !datos.nombre.trim() || !datos.password) throw new Error("Completá nombre, usuario y contraseña");

    await llamarRpc(sesion, "admin_crear_usuario", {
      p_user_name: usuario,
      p_nombre_real: datos.nombre.trim(),
      p_rol: datos.rol,
      p_password: datos.password,
      p_telefono: datos.telefono.trim() || null,
    });
    refresh();
  }, "No se pudo crear el usuario");
}

export async function actualizarUsuario(usuarioOriginal: string, datos: DatosUsuario) {
  return capturar(async () => {
    const sesion = await exigirPermisoSobreRol(datos.rol);
    const usuarioNuevo = datos.usuario.trim().toLowerCase();
    if (!usuarioNuevo) throw new Error("El usuario no puede quedar vacío");

    await llamarRpc(sesion, "admin_actualizar_usuario", {
      p_username_original: usuarioOriginal,
      p_nombre_real: datos.nombre.trim(),
      p_user_name_nuevo: usuarioNuevo,
      p_rol: datos.rol,
      p_telefono: datos.telefono.trim() || null,
    });

    // Contraseña vacía = no se quiere cambiar.
    if (datos.password) {
      await llamarRpc(sesion, "actualizar_password", {
        p_user_name: usuarioNuevo,
        p_nueva_pass: datos.password,
      });
    }
    refresh();
  }, "No se pudo actualizar el usuario");
}

export async function eliminarUsuario(userName: string) {
  return capturar(async () => {
    const sesion = await exigirSesion(adminOJefeBarra);
    await llamarRpc(sesion, "admin_eliminar_usuario", { p_user_name: userName });
    refresh();
  }, "No se pudo eliminar el usuario");
}

// === BLOQUEO DE LA TABLA DE PERSONAL REGISTRADO ===
// Antes la clave estaba escrita en el JavaScript del navegador (cualquiera la
// podía leer). Ahora se compara acá, contra una variable de entorno, y queda
// desbloqueada con una cookie httpOnly mientras dure la sesión del navegador.

const PANELES = {
  admin: { variable: "CLAVE_PANEL_ADMIN", permitido: soloAdmin },
  "jefe-barra": { variable: "CLAVE_PANEL_JEFE_BARRA", permitido: adminOJefeBarra },
} as const;

export type PanelProtegido = keyof typeof PANELES;

const cookieDesbloqueo = (panel: PanelProtegido) => `mj_desbloqueo_${panel}`;

export async function panelDesbloqueado(panel: PanelProtegido): Promise<boolean> {
  const almacen = await cookies();
  return almacen.get(cookieDesbloqueo(panel))?.value === "1";
}

export async function desbloquearPanel(panel: PanelProtegido, clave: string) {
  return capturar(async () => {
    const config = PANELES[panel];
    await exigirSesion(config.permitido);
    const claveCorrecta = process.env[config.variable];
    if (!claveCorrecta) throw new Error(`Falta ${config.variable} en las variables de entorno`);
    if (clave !== claveCorrecta) throw new Error("Contraseña incorrecta");

    const almacen = await cookies();
    almacen.set(cookieDesbloqueo(panel), "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    refresh();
  }, "No se pudo desbloquear");
}

export async function bloquearPanel(panel: PanelProtegido) {
  const almacen = await cookies();
  almacen.delete(cookieDesbloqueo(panel));
  refresh();
}
