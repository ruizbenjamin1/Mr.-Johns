// === CONEXIÓN CON LA NUBE DE SUPABASE ===
const SUPABASE_URL = "https://junoitdzytgjrtljfueq.supabase.co";
const SUPABASE_KEY = "sb_publishable_j_IpAMVeeNy6U6kNN11FyA_YyjZiFzc";

// Inicializamos el cliente global de Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Función global para obtener el Lunes de la semana actual en formato YYYY-MM-DD
function obtenerLunesSemanaActual() {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0: Domingo, 1: Lunes, etc.
    const diferencia = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const lunes = new Date(hoy.setDate(diferencia));
    return lunes.toISOString().split('T')[0];
}