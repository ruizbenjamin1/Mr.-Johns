# Mr. Johns

Sistema de gestión de personal, stock y propinas de Mr. Johns.

**Stack:** Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui, con Supabase como base de datos.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # ya trae los datos de Supabase
npm run dev                  # http://localhost:3000
```

## Estructura

- `src/app/` — páginas: login (`/`), `/admin`, `/jefe-barra`, `/supervisor`, `/dashboard`
- `src/app/acciones-sesion.ts` — login y logout (Server Actions que llaman a las RPC de Supabase)
- `src/proxy.ts` — control de acceso por rol antes de mostrar cada página
- `src/lib/roles.ts` — roles y a qué página va cada uno
- `src/components/ui/` — componentes de shadcn

## Variables de entorno

Todas están en `.env.example`. En Vercel se cargan en *Settings → Environment Variables*.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Conexión a Supabase |
| `APPS_SCRIPT_URL` | Planilla de Google Sheets (stock y propinas). Solo la usa el servidor |
| `CLAVE_PANEL_ADMIN` / `CLAVE_PANEL_JEFE_BARRA` | Desbloquean las tablas de personal registrado |

## Qué cambió respecto del sistema viejo

- **Sesión:** cookie httpOnly en vez de `sessionStorage`; el navegador nunca ve el token.
- **Permisos:** `src/proxy.ts` controla el rol antes de mostrar cada página, y cada acción lo vuelve a controlar en el servidor (además de las RPC).
- **Hora del turno:** los cálculos (corte de turno a las 6 AM, semana actual) usan siempre la hora de Argentina, aunque el servidor esté en otro huso.
- **Google Sheets:** los envíos salen del servidor y se confirma si la planilla los recibió (antes, con `no-cors`, no había forma de saberlo). Si falla, el aviso tiene un botón para reintentar.
- **Claves de los paneles protegidos:** las compara el servidor; ya no están en el código del navegador.
- **Buscador de stock:** ahora funciona (antes el campo no estaba conectado).

## Estado de la migración

- [x] Scaffold, tema oscuro/claro, login y sesión
- [x] Dashboard del personal (agenda, carta, notas, conteo de stock)
- [x] Panel de Administración
- [x] Panel de Jefe de Barra
- [x] Panel de Supervisor
- [x] Probado con datos reales; sistema viejo (`legacy/`) eliminado

El sistema anterior en HTML + JS sigue disponible en el historial de git (commit `a0c1cc4`).
