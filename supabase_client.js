// === CONEXIÓN CON LA NUBE DE SUPABASE ===
const SUPABASE_URL = "https://junoitdzytgjrtljfueq.supabase.co";
const SUPABASE_KEY = "sb_publishable_j_IpAMVeeNy6U6kNN11FyA_YyjZiFzc";

// Inicializamos el cliente global de Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatea una fecha en YYYY-MM-DD usando componentes LOCALES (sin pasar por UTC,
// para evitar que horarios nocturnos "corran" la fecha al día siguiente)
function formatearFechaLocal(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// === HORARIO DE CORTE DEL TURNO ===
// El turno arranca de noche y termina recién a las 6:00 de la mañana del día
// siguiente. Si usáramos la fecha de calendario tal cual, apenas cruza la
// medianoche la app ya piensa que "hoy" es el día siguiente -y el personal
// convocado para "anoche" desaparece de los paneles de propinas, aunque el
// turno siga en curso-. Por eso, para todo lo que depende de "qué día es hoy"
// (disponibilidad vigente, semana actual, etc.) usamos esta fecha "operativa"
// en vez de "new Date()": mientras sea antes de las 6 AM, todavía se considera
// que estamos en el día de ayer.
const HORA_CORTE_TURNO = 6; // 6:00 AM

function obtenerFechaOperativa() {
    const ahora = new Date();
    if (ahora.getHours() < HORA_CORTE_TURNO) {
        const ayer = new Date(ahora);
        ayer.setDate(ahora.getDate() - 1);
        return ayer;
    }
    return ahora;
}

// Función global para obtener el Lunes de la semana actual en formato YYYY-MM-DD
function obtenerLunesSemanaActual() {
    const hoy = obtenerFechaOperativa();
    const diaSemana = hoy.getDay(); // 0: Domingo, 1: Lunes, etc.
    const diferencia = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), diferencia);
    return formatearFechaLocal(lunes);
}

// === CONTROL DE DISPONIBILIDAD POR DÍA (Se "borra" automáticamente al pasar el día) ===

// Función para obtener el Lunes de la semana correspondiente a CUALQUIER fecha (usada con updated_at)
function obtenerLunesDeFecha(fechaInput) {
    const fecha = new Date(fechaInput);
    const diaSemana = fecha.getDay();
    const diferencia = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), diferencia);
    return formatearFechaLocal(lunes);
}

// Orden de los días (Lunes = índice 0 ... Domingo = índice 6)
const ordenDiasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

// Normaliza "Sábado", "sábado", "SABADO" -> "sabado"
function normalizarDiaClave(dia) {
    return (dia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Devuelve el índice (0-6) del día de HOY (según la fecha operativa, no la de
// calendario), tomando Lunes como inicio de semana
function obtenerIndiceDiaHoy() {
    return (obtenerFechaOperativa().getDay() + 6) % 7;
}

// true si ese día de la semana actual ya pasó (respecto al día operativo de hoy)
function yaPasoEsteDiaEnLaSemana(diaClave) {
    const idxDia = ordenDiasSemana.indexOf(normalizarDiaClave(diaClave));
    if (idxDia === -1) return false;
    return idxDia < obtenerIndiceDiaHoy();
}

// true si la disponibilidad marcada para ese día todavía es válida:
// - el día todavía no pasó esta semana (considerando el corte de turno a las 6 AM)
// - y fue guardada/actualizada dentro de la semana actual (no es de una semana vieja)
function estaDisponibilidadVigente(diaClave, fechaActualizacion) {
    if (yaPasoEsteDiaEnLaSemana(diaClave)) return false;
    if (!fechaActualizacion) return false;

    const semanaGuardada = obtenerLunesDeFecha(fechaActualizacion);
    const semanaActual = obtenerLunesSemanaActual();
    return semanaGuardada === semanaActual;
}