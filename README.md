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
- `legacy/` — el sistema anterior en HTML + JS, de referencia mientras dura la migración

## Estado de la migración

- [x] Scaffold, tema oscuro/claro, login y sesión
- [ ] Dashboard del personal (stock, agenda)
- [ ] Panel de Administración
- [ ] Panel de Jefe de Barra
- [ ] Panel de Supervisor
- [ ] Envíos a Google Sheets desde el servidor
