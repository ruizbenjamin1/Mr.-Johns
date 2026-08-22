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

// Función global para obtener el Lunes de la semana actual en formato YYYY-MM-DD
function obtenerLunesSemanaActual() {
    const hoy = new Date();
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

// Devuelve el índice (0-6) del día de HOY, tomando Lunes como inicio de semana
function obtenerIndiceDiaHoy() {
    return (new Date().getDay() + 6) % 7;
}

// true si ese día de la semana actual ya pasó (respecto a la fecha de hoy)
function yaPasoEsteDiaEnLaSemana(diaClave) {
    const idxDia = ordenDiasSemana.indexOf(normalizarDiaClave(diaClave));
    if (idxDia === -1) return false;
    return idxDia < obtenerIndiceDiaHoy();
}

// true si la disponibilidad marcada para ese día todavía es válida:
// - el día todavía no pasó esta semana
// - y fue guardada/actualizada dentro de la semana actual (no es de una semana vieja)
function estaDisponibilidadVigente(diaClave, fechaActualizacion) {
    if (yaPasoEsteDiaEnLaSemana(diaClave)) return false;
    if (!fechaActualizacion) return false;

    const semanaGuardada = obtenerLunesDeFecha(fechaActualizacion);
    const semanaActual = obtenerLunesSemanaActual();
    return semanaGuardada === semanaActual;
}