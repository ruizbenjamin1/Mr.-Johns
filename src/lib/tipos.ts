// Formas de las filas que se leen de Supabase.

export type Usuario = {
  user_name: string;
  nombre_real: string | null;
  rol: string;
  telefono: string | null;
};

export type Agenda = {
  user_name: string;
  lunes: boolean | null;
  martes: boolean | null;
  miercoles: boolean | null;
  jueves: boolean | null;
  viernes: boolean | null;
  sabado: boolean | null;
  domingo: boolean | null;
  observaciones: string | null;
  updated_at: string | null;
};

export type Convocado = {
  user_name: string;
  dia: string | null;
  sector: string | null;
  propina_individual: number | null;
  semana_lunes: string | null;
};

export type ValoresStock = Record<string, { inicial: string; final: string }>;

export type ProgresoStock = {
  barra: string;
  responsable: string | null;
  valores: ValoresStock | null;
  inicial_enviado: boolean | null;
  timestamp_inicial: string | null;
};

/** Resultado de toda Server Action que puede fallar. */
export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string };
