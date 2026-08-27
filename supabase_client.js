// === CONEXIÓN CON LA NUBE DE SUPABASE ===
const SUPABASE_URL = "https://junoitdzytgjrtljfueq.supabase.co";
const SUPABASE_KEY = "sb_publishable_j_IpAMVeeNy6U6kNN11FyA_YyjZiFzc";

// Inicializamos el cliente global de Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === ESCAPE DE TEXTO PARA HTML (evita inyección de código) ===
// Cualquier texto que haya escrito el personal (por ejemplo las notas de la
// agenda semanal) y que después se muestra armando HTML a mano con innerHTML
// tiene que pasar por acá antes. Si no, alguien podría escribir algo como
// "<img src=x onerror=...>" en sus notas y ese código se ejecutaría en el
// navegador de quien abra el panel de administración.
// === TOKEN DE SESION (emitido por verificar_login, guardado en sessionStorage) ===
// Todas las escrituras sensibles ahora pasan por funciones RPC que validan este
// token y el rol del usuario del lado del servidor -ya no alcanza con "parecer"
// logueado en el navegador, como pasaba antes-.
function obtenerTokenSesion() {
    return sessionStorage.getItem("tokenSesion");
}

function escaparHTML(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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

// === VISTA SEMANAL (grilla compartida por admin.html y jefe_barra.html) ===
// Antes había que ir cambiando el selector de día uno por uno para ver el
// panorama completo de la semana. Esta grilla usa los mismos datos que ya se
// cargan para el panel de día único (no dispara ninguna consulta nueva) y
// muestra, de un vistazo, quién está disponible/convocado cada día.
const diasSemanaDisplay = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function renderizarGrillaSemanal(usuariosDB, agendasDB, convocadosDB, filtroRol, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const personal = usuariosDB.filter(u => filtroRol(u.rol));
    if (personal.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small text-center my-2 mb-0">Sin personal para mostrar.</p>`;
        return;
    }

    let filasHTML = "";
    personal.forEach(usuario => {
        const agendaUsuario = agendasDB.find(a => a.user_name === usuario.user_name);

        let celdasHTML = "";
        diasSemanaDisplay.forEach(diaLabel => {
            const claveDia = normalizarDiaClave(diaLabel);
            const disponible = agendaUsuario
                && agendaUsuario[claveDia] === true
                && estaDisponibilidadVigente(claveDia, agendaUsuario.updated_at);
            const convocado = convocadosDB.find(c => c.user_name === usuario.user_name && (c.dia === diaLabel || (!c.dia && diaLabel === 'Sábado')));

            let claseBadge = "bg-secondary bg-opacity-25 text-secondary";
            let texto = "—";
            if (convocado) {
                claseBadge = "bg-success bg-opacity-25 text-success border border-success";
                texto = convocado.sector || "Convocado";
            } else if (disponible) {
                claseBadge = "bg-warning bg-opacity-25 text-warning border border-warning";
                texto = "Disponible";
            }

            celdasHTML += `
                <td class="text-center" style="cursor:pointer;" onclick="seleccionarDiaDesdeGrilla('${diaLabel}')" title="Ir a ${diaLabel}">
                    <span class="badge ${claseBadge} small">${texto}</span>
                </td>`;
        });

        filasHTML += `
            <tr>
                <td class="text-start ps-2 fw-bold text-light">${escaparHTML(usuario.nombre_real || usuario.user_name)}</td>
                ${celdasHTML}
            </tr>`;
    });

    contenedor.innerHTML = `
        <div class="table-responsive rounded-3 border border-secondary">
            <table class="table table-dark-custom align-middle text-center mb-0" style="font-size: 0.8rem;">
                <thead>
                    <tr>
                        <th class="text-start ps-2">Personal</th>
                        ${diasSemanaDisplay.map(d => `<th>${d.slice(0, 3)}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>${filasHTML}</tbody>
            </table>
        </div>`;
}

// Click en una celda de la grilla: salta el selector de día principal a ese
// día y hace scroll al panel de gestión para actuar (convocar, asignar sector, etc).
function seleccionarDiaDesdeGrilla(dia) {
    const selectDia = document.getElementById("select-dia-gestion");
    if (selectDia) {
        selectDia.value = dia;
        selectDia.dispatchEvent(new Event("change"));
    }
    const ancla = document.getElementById("equipo-convocado-final") || document.getElementById("equipo-barra-final");
    if (ancla) ancla.scrollIntoView({ behavior: "smooth", block: "center" });
}
window.seleccionarDiaDesdeGrilla = seleccionarDiaDesdeGrilla;

// === AVISO POR WHATSAPP (link "click to send", sin costo ni cuentas nuevas) ===
// No manda nada solo: abre WhatsApp con el mensaje ya escrito para que quien
// convoca lo revise y lo mande con un toque. Devuelve null si no hay teléfono
// cargado (para poder ocultar el botón en ese caso).
function construirEnlaceWhatsApp(telefono, mensaje) {
    const soloDigitos = (telefono || "").replace(/\D/g, "");
    if (!soloDigitos) return null;
    return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}

// === RESPALDO DE ENVÍOS A GOOGLE SHEETS (los webhooks usan mode:"no-cors") ===
// Con "no-cors" el navegador NUNCA puede leer si Google Sheets realmente
// recibió y proceso el POST -es una limitación del lado del Apps Script
// externo, no algo que se pueda arreglar desde acá-. Lo que sí podemos
// garantizar es que, si el fetch falla de verdad (sin internet, servidor
// caído), el envío no se pierda en silencio: se guarda en localStorage hasta
// que se reintenta con éxito.
function enviarConRespaldo(url, payload, claveRespaldo) {
    localStorage.setItem(claveRespaldo, JSON.stringify({ payload, fecha: new Date().toISOString() }));
    return fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        localStorage.removeItem(claveRespaldo);
    });
}

function obtenerUltimoIntentoFallido(claveRespaldo) {
    try {
        const guardado = localStorage.getItem(claveRespaldo);
        return guardado ? JSON.parse(guardado) : null;
    } catch (err) {
        return null;
    }
}

// Muestra (o esconde) el aviso de "envío no confirmado" con botón de reintentar.
// Se llama al cargar la página y de nuevo después de cada intento de envío.
function verificarEnvioPendiente(claveRespaldo, contenedorId, urlDestino) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const pendiente = obtenerUltimoIntentoFallido(claveRespaldo);
    if (!pendiente) {
        contenedor.innerHTML = "";
        return;
    }

    const fechaTexto = new Date(pendiente.fecha).toLocaleString('es-AR');
    const idBoton = `btn-reintentar-${claveRespaldo}`;
    contenedor.innerHTML = `
        <div class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mt-2 mb-0 small">
            <span><i class="bi bi-exclamation-triangle-fill me-1"></i>Un envío del ${fechaTexto} no se pudo confirmar.</span>
            <button type="button" class="btn btn-sm btn-warning fw-bold" id="${idBoton}">Reintentar envío</button>
        </div>`;

    document.getElementById(idBoton).addEventListener("click", async () => {
        try {
            await enviarConRespaldo(urlDestino, pendiente.payload, claveRespaldo);
            mostrarNotificacion("Reenviado. Revisá la planilla para confirmar que llegó.", "exito");
        } catch (err) {
            mostrarNotificacion("Sigue sin poder enviarse. Revisá la conexión.", "error");
        }
        verificarEnvioPendiente(claveRespaldo, contenedorId, urlDestino);
    });
}