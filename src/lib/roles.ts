// Roles y rutas en UN solo lugar (antes estaba repetido en app.js y en el
// control de acceso de cada página, y no coincidían entre sí: el login
// mandaba "superadministrador" o "barman" a páginas que después los rebotaban).

export type Rol = string;

const ROLES_ADMIN = ["super_admin", "admin", "superadministrador"];
const ROLES_JEFE_BARRA = ["admin_barra", "administrador_barra", "barman"];
const ROLES_SUPERVISOR = ["supervisor"];

export const RUTAS = {
  admin: "/admin",
  jefeBarra: "/jefe-barra",
  supervisor: "/supervisor",
  dashboard: "/dashboard",
} as const;

/** Página de inicio de cada rol (a dónde va después del login). */
export function rutaInicioPorRol(rol: Rol): string {
  if (ROLES_ADMIN.includes(rol)) return RUTAS.admin;
  if (ROLES_JEFE_BARRA.includes(rol)) return RUTAS.jefeBarra;
  if (ROLES_SUPERVISOR.includes(rol)) return RUTAS.supervisor;
  return RUTAS.dashboard;
}

/**
 * Quién puede entrar a cada sección. Igual que en el sistema viejo:
 * los administradores también pueden entrar al panel de jefe de barra,
 * y el dashboard del personal está abierto a cualquier usuario logueado.
 */
export function puedeEntrar(rol: Rol, ruta: string): boolean {
  if (ruta.startsWith(RUTAS.admin)) return ROLES_ADMIN.includes(rol);
  if (ruta.startsWith(RUTAS.jefeBarra))
    return ROLES_JEFE_BARRA.includes(rol) || ROLES_ADMIN.includes(rol);
  if (ruta.startsWith(RUTAS.supervisor)) return ROLES_SUPERVISOR.includes(rol);
  if (ruta.startsWith(RUTAS.dashboard)) return true;
  return true;
}

export const RUTAS_PROTEGIDAS = Object.values(RUTAS);
