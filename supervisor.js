// Helper global para notificaciones flotantes (Toasts)
// Toastify por sí solo es invisible para lectores de pantalla (es un div que
// aparece en pantalla sin avisar nada): por eso, además de mostrar el toast,
// escribimos el mismo mensaje en una región "aria-live" oculta, que es lo que
// hace que el lector de pantalla lo anuncie solo.
function mostrarNotificacion(mensaje, tipo = "exito") {
    let regionAria = document.getElementById("notificacion-aria-live");
    if (!regionAria) {
        regionAria = document.createElement("div");
        regionAria.id = "notificacion-aria-live";
        regionAria.setAttribute("role", "status");
        regionAria.setAttribute("aria-live", "polite");
        regionAria.className = "visually-hidden";
        document.body.appendChild(regionAria);
    }
    regionAria.textContent = mensaje;

    if (typeof Toastify !== "undefined") {
        Toastify({
            text: mensaje,
            duration: 3000,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: {
                background: tipo === "exito"
                    ? "linear-gradient(to right, #00b09b, #96c93d)"
                    : "linear-gradient(to right, #ff5f6d, #ffc371)",
                borderRadius: "8px",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                color: "#ffffff"
            }
        }).showToast();
    } else {
        alert(mensaje);
    }
}

// === SEMANA ACTUAL (mismo criterio que el resto de la app: el turno de
// anoche sigue siendo "hoy" hasta las 6 AM) ===
const semanaActualStr = obtenerLunesSemanaActual();
const diasSemanaNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const diaActualNombre = diasSemanaNombres[obtenerFechaOperativa().getDay()];

document.addEventListener("DOMContentLoaded", async () => {
    inicializarToggleTema("btn-toggle-tema");

    // === VERIFICACIÓN DE SEGURIDAD ===
    // Esta pantalla es de solo lectura: no tiene ningún botón que escriba en
    // la base, así que alcanza con el mismo control de rol que usan las demás
    // pantallas (defensa real está en las RPC, que validan el token de nuevo).
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario");

    if (!usuarioActivo || rolUsuario !== "supervisor") {
        mostrarNotificacion("Acceso denegado. Se requiere cuenta de Supervisor.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    const textoFecha = document.getElementById("texto-fecha-hoy");
    if (textoFecha) {
        const hoyLegible = obtenerFechaOperativa().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
        textoFecha.innerText = `Hoy es ${diaActualNombre}, ${hoyLegible}`;
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await _supabase.rpc('cerrar_sesion', { p_token: obtenerTokenSesion() });
            sessionStorage.clear();
            mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
        });
    }

    // === DÍA SELECCIONADO PARA EL DETALLE DE ABAJO ===
    // Arranca en el día de hoy (no siempre Sábado como en Admin/Jefe de Barra:
    // acá tiene más sentido que el Supervisor vea primero el día en curso).
    let diaSeleccionado = diaActualNombre === "Sábado" || diasSemanaNombres.includes(diaActualNombre) ? diaActualNombre : "Sábado";
    const selectDia = document.getElementById("select-dia-gestion");
    if (selectDia) {
        selectDia.value = diaSeleccionado;
        selectDia.addEventListener("change", (e) => {
            diaSeleccionado = e.target.value;
            cargarPanelSupervisor();
        });
    }

    // === EQUIPO CONVOCADO DEL DÍA SELECCIONADO (solo lectura) ===
    // Esta pantalla no tiene ningún botón para convocar, sacar o reasignar a
    // nadie: eso sigue siendo tarea exclusiva de Admin / Jefe de Barra.
    async function cargarPanelSupervisor() {
        const listaMozos = document.getElementById("lista-mozos-dia");
        const listaBartenders = document.getElementById("lista-bartenders-dia");

        try {
            const [resUsuarios, resConvocados] = await Promise.all([
                _supabase.from('usuarios_public').select('user_name, nombre_real, rol'),
                _supabase.from('convocados').select('*').eq('semana_lunes', semanaActualStr)
            ]);

            if (resUsuarios.error) throw resUsuarios.error;
            if (resConvocados.error) throw resConvocados.error;

            const usuariosDB = resUsuarios.data || [];
            const convocadosDB = resConvocados.data || [];

            const convocadosDelDia = convocadosDB.filter(c =>
                c.dia === diaSeleccionado || (!c.dia && diaSeleccionado === 'Sábado')
            );

            const armarLista = (rolBuscado) => {
                const filas = convocadosDelDia
                    .map(c => ({ convocado: c, usuario: usuariosDB.find(u => u.user_name === c.user_name) }))
                    .filter(f => f.usuario && f.usuario.rol === rolBuscado);

                if (filas.length === 0) {
                    return `<p class="text-muted small text-center my-2 mb-0">Nadie convocado para el ${diaSeleccionado}.</p>`;
                }

                return filas.map(f => `
                    <div class="list-group-item list-group-item-custom d-flex justify-content-between align-items-center rounded-3 mb-2">
                        <span class="fw-bold text-light">${escaparHTML(f.usuario.nombre_real || f.usuario.user_name)}</span>
                        <span class="badge bg-success bg-opacity-25 text-success border border-success">${escaparHTML(f.convocado.sector || 'Principal')}</span>
                    </div>`).join('');
            };

            if (listaMozos) listaMozos.innerHTML = armarLista('mozo');
            if (listaBartenders) listaBartenders.innerHTML = armarLista('bartender');
        } catch (err) {
            console.error("Error al cargar el panel del Supervisor:", err);
            if (listaMozos) listaMozos.innerHTML = `<p class="text-danger small text-center my-2 mb-0">No se pudo cargar.</p>`;
            if (listaBartenders) listaBartenders.innerHTML = `<p class="text-danger small text-center my-2 mb-0">No se pudo cargar.</p>`;
        }
    }

    await cargarPanelSupervisor();
    renderizarResumenStock('resumen-stock-supervisor');

    // === HISTORIAL DE STOCK (leído en vivo desde Google Sheets vía Apps Script) ===
    // A diferencia del resto de la app, esto NO pasa por Supabase: el Apps
    // Script expone un doGet de solo lectura sobre la misma planilla donde ya
    // cae el stock que se manda desde el Dashboard del bartender.
    const selectSemana = document.getElementById("select-historial-semana");
    const selectBarra = document.getElementById("select-historial-barra");
    const btnVerHistorial = document.getElementById("btn-ver-historial");
    const resultadoHistorial = document.getElementById("resultado-historial-stock");

    if (selectBarra) {
        listaBarrasStock.forEach(barra => {
            selectBarra.innerHTML += `<option value="${barra}">${barra}</option>`;
        });
    }

    async function cargarSemanasHistorial() {
        if (!selectSemana) return;
        try {
            const resp = await fetch(`${URL_APPS_SCRIPT}?accion=semanas`);
            const data = await resp.json();
            if (data.status !== "success") throw new Error(data.error || "Respuesta inesperada del Apps Script");

            const semanas = data.semanas || [];
            if (semanas.length === 0) {
                selectSemana.innerHTML = `<option value="">No hay stock cargado todavía</option>`;
                return;
            }
            selectSemana.innerHTML = semanas.map(s => `<option value="${escaparHTML(s)}">Semana del ${escaparHTML(s)}</option>`).join('');
        } catch (err) {
            console.error("Error al cargar las semanas del historial:", err);
            selectSemana.innerHTML = `<option value="">No se pudo conectar con Google Sheets</option>`;
        }
    }

    function renderizarTablaHistorial(filas) {
        if (!resultadoHistorial) return;

        if (filas.length === 0) {
            resultadoHistorial.innerHTML = `<p class="text-muted small text-center my-2 mb-0">No hay filas cargadas para esa búsqueda.</p>`;
            return;
        }

        const filasHTML = filas.map(f => `
            <tr>
                <td class="text-start ps-2">${escaparHTML(f.barra)}</td>
                <td class="text-start">${escaparHTML(f.producto)}</td>
                <td class="text-start">${escaparHTML(f.responsable)}</td>
                <td>${f.inicial === "" || f.inicial === undefined ? '—' : escaparHTML(String(f.inicial))}</td>
                <td>${f.final === "" || f.final === undefined ? '—' : escaparHTML(String(f.final))}</td>
                <td class="fw-bold">${f.diferencia === "" || f.diferencia === undefined ? '—' : escaparHTML(String(f.diferencia))}</td>
            </tr>`).join('');

        resultadoHistorial.innerHTML = `
            <div class="table-responsive rounded-3 border border-secondary">
                <table class="table table-dark-custom align-middle text-center mb-0" style="font-size: 0.8rem;">
                    <thead>
                        <tr>
                            <th class="text-start ps-2">Barra</th>
                            <th class="text-start">Producto</th>
                            <th class="text-start">Responsable</th>
                            <th>Inicial</th>
                            <th>Final</th>
                            <th>Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>${filasHTML}</tbody>
                </table>
            </div>`;
    }

    async function verHistorialStock() {
        if (!resultadoHistorial) return;
        const semana = selectSemana ? selectSemana.value : "";
        const barra = selectBarra ? selectBarra.value : "";

        if (!semana) {
            mostrarNotificacion("Elegí una semana primero.", "error");
            return;
        }

        resultadoHistorial.innerHTML = `<p class="text-muted small text-center my-2 mb-0">Cargando...</p>`;
        try {
            let url = `${URL_APPS_SCRIPT}?accion=historial&semana=${encodeURIComponent(semana)}`;
            if (barra) url += `&barra=${encodeURIComponent(barra)}`;

            const resp = await fetch(url);
            const data = await resp.json();
            if (data.status !== "success") throw new Error(data.error || "Respuesta inesperada del Apps Script");

            renderizarTablaHistorial(data.filas || []);
        } catch (err) {
            console.error("Error al cargar el historial de stock:", err);
            resultadoHistorial.innerHTML = `<p class="text-danger small text-center my-2 mb-0">No se pudo cargar el historial. Puede que el Apps Script todavía no tenga la nueva versión publicada (hace falta "Nueva versión" en Implementar > Administrar implementaciones).</p>`;
        }
    }

    if (btnVerHistorial) btnVerHistorial.addEventListener("click", verHistorialStock);

    await cargarSemanasHistorial();

    // === PROPINAS (leído en vivo desde Google Sheets vía Apps Script) ===
    // "Barras": la pestaña tiene una fila por cada bartender convocado, y
    // todos los que comparten una misma barra esa noche quedan con el mismo
    // monto (es el total de la barra, no el de la persona) -el Apps Script ya
    // se encarga de no contarlo más de una vez por barra/noche-.
    // "Mozos": cada fila ya es la propina individual de una persona.
    const botonesTipoPropina = document.querySelectorAll(".btn-tipo-propina");
    const selectPropinasFecha = document.getElementById("select-propinas-fecha");
    const resumenPropinas = document.getElementById("resumen-propinas");
    let tipoPropinaActual = "barras";
    let datosPropinasCache = [];

    const estilosTipoPropina = {
        barras: { activo: ["btn-success", "text-dark"], inactivo: ["btn-outline-success"] },
        mozos: { activo: ["btn-warning", "text-dark"], inactivo: ["btn-outline-warning"] }
    };

    function renderizarPropinas() {
        if (!resumenPropinas) return;
        const fechaFiltro = selectPropinasFecha ? selectPropinasFecha.value : "";
        const filas = fechaFiltro ? datosPropinasCache.filter(f => f.fecha === fechaFiltro) : datosPropinasCache;

        if (filas.length === 0) {
            resumenPropinas.innerHTML = `<p class="text-muted small text-center my-2 mb-0">No hay propinas cargadas para esa búsqueda.</p>`;
            return;
        }

        resumenPropinas.innerHTML = filas.map(f => {
            const titulo = tipoPropinaActual === "mozos" ? (f.nombre || "Sin nombre") : f.barra;
            const subtitulo = tipoPropinaActual === "mozos"
                ? `${escaparHTML(f.barra || '')} · ${escaparHTML(f.fecha)}`
                : escaparHTML(f.fecha);

            return `
                <div class="list-group-item list-group-item-custom d-flex justify-content-between align-items-center rounded-3 mb-2">
                    <div>
                        <span class="fw-bold text-light">${escaparHTML(titulo)}</span>
                        <div class="text-muted small">${subtitulo}</div>
                    </div>
                    <span class="badge bg-dark border border-success text-success px-3 py-2">$${Number(f.monto || 0).toLocaleString('es-AR')}</span>
                </div>`;
        }).join('');
    }

    async function cargarPropinas(tipo) {
        if (!resumenPropinas) return;
        resumenPropinas.innerHTML = `<p class="text-muted small text-center my-2 mb-0">Cargando...</p>`;

        try {
            const resp = await fetch(`${URL_APPS_SCRIPT}?accion=propinas&tipo=${tipo}`);
            const data = await resp.json();
            if (data.status !== "success") throw new Error(data.error || "Respuesta inesperada del Apps Script");

            datosPropinasCache = data.filas || [];

            const fechas = [...new Set(datosPropinasCache.map(f => f.fecha))].sort().reverse();
            if (selectPropinasFecha) {
                const fechaPrevia = selectPropinasFecha.value;
                selectPropinasFecha.innerHTML = '<option value="">Todas las fechas</option>' +
                    fechas.map(f => `<option value="${escaparHTML(f)}">${escaparHTML(f)}</option>`).join('');
                if (fechas.includes(fechaPrevia)) selectPropinasFecha.value = fechaPrevia;
            }

            renderizarPropinas();
        } catch (err) {
            console.error("Error al cargar las propinas:", err);
            resumenPropinas.innerHTML = `<p class="text-danger small text-center my-2 mb-0">No se pudo cargar. Puede que el Apps Script todavía no tenga la nueva versión publicada (hace falta "Nueva versión" en Implementar > Administrar implementaciones).</p>`;
        }
    }

    botonesTipoPropina.forEach(btn => {
        btn.addEventListener("click", () => {
            const tipo = btn.getAttribute("data-tipo");
            if (tipo === tipoPropinaActual) return;
            tipoPropinaActual = tipo;

            botonesTipoPropina.forEach(b => {
                const estilos = estilosTipoPropina[b.getAttribute("data-tipo")];
                const activo = b === btn;
                b.classList.remove(...estilos.activo, ...estilos.inactivo);
                b.classList.add(...(activo ? estilos.activo : estilos.inactivo));
            });

            if (selectPropinasFecha) selectPropinasFecha.value = "";
            cargarPropinas(tipoPropinaActual);
        });
    });

    if (selectPropinasFecha) selectPropinasFecha.addEventListener("change", renderizarPropinas);

    await cargarPropinas(tipoPropinaActual);
});
