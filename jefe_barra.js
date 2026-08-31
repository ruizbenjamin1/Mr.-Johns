// Helper global para notificaciones flotantes (Toasts)
function mostrarNotificacion(mensaje, tipo = "exito") {
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

// === SEMANA ACTUAL (LUNES EN FORMATO YYYY-MM-DD) ===
// Todas las convocatorias se etiquetan con esto para que una convocatoria de
// una semana vieja nunca se mezcle con la actual (antes solo se filtraba por
// día, y "Viernes" de hace un mes quedaba pegado con el "Viernes" de hoy).
const semanaActualStr = obtenerLunesSemanaActual();

document.addEventListener("DOMContentLoaded", async () => {
    inicializarToggleTema("btn-toggle-tema");

    // === 1. VERIFICACIÓN DE SEGURIDAD ===
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario");

    if (!usuarioActivo || (rolUsuario !== "admin_barra" && rolUsuario !== "super_admin" && rolUsuario !== "admin")) {
        mostrarNotificacion("Acceso denegado. Se requiere cuenta de Jefe de Barra.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    const sectoresBarra = ["Vip", "Cantina", "Altillo", "Principal", "Patio", "Evento"];
    const URL_WEBHOOK_SHEETS = "https://script.google.com/macros/s/AKfycbw8u2MFzpmLOFzHkqasuDrFuBwhB8qDQSnSYX6xKY4p9SBllkOM14_UzuLF8nB2VnXWSQ/exec";
    const CLAVE_RESPALDO_EXPORT_BARRAS = "respaldoExportBarras";
    const COOLDOWN_EXPORT_MS = 2 * 60 * 1000; // 2 minutos, para evitar filas duplicadas por doble click
    verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_BARRAS, 'respaldo-pendiente-barras', URL_WEBHOOK_SHEETS);

    // === CONTRASEÑA PARA VER LA TABLA DE BARTENDERS REGISTRADOS ===
    // Cambiá esta clave por la que quieras usar.
    const CLAVE_PANEL_REGISTRADOS = "river.erome";

    function configurarBloqueoRegistrados(prefijo, clave) {
        const bloqueo = document.getElementById(`bloqueo-crud-${prefijo}`);
        const contenido = document.getElementById(`contenido-crud-${prefijo}`);
        const input = document.getElementById(`input-clave-crud-${prefijo}`);
        const btnDesbloquear = document.getElementById(`btn-desbloquear-crud-${prefijo}`);
        const btnBloquear = document.getElementById(`btn-bloquear-crud-${prefijo}`);

        if (!bloqueo || !contenido) return;

        const claveSesion = `crudDesbloqueado_${prefijo}`;

        const mostrarContenido = () => {
            bloqueo.classList.add("d-none");
            contenido.classList.remove("d-none");
            sessionStorage.setItem(claveSesion, "true");
        };

        const ocultarContenido = () => {
            contenido.classList.add("d-none");
            bloqueo.classList.remove("d-none");
            sessionStorage.removeItem(claveSesion);
            if (input) input.value = "";
        };

        // Si ya se desbloqueó antes en esta misma sesión de trabajo, lo dejamos visible
        if (sessionStorage.getItem(claveSesion) === "true") {
            mostrarContenido();
        }

        if (btnDesbloquear) {
            btnDesbloquear.addEventListener("click", () => {
                if (input && input.value === clave) {
                    mostrarContenido();
                } else {
                    mostrarNotificacion("Contraseña incorrecta.", "error");
                }
            });
        }

        if (input) {
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (btnDesbloquear) btnDesbloquear.click();
                }
            });
        }

        if (btnBloquear) {
            btnBloquear.addEventListener("click", ocultarContenido);
        }
    }

    configurarBloqueoRegistrados("bartenders", CLAVE_PANEL_REGISTRADOS);

    // ESTADO DEL DÍA SELECCIONADO
    let diaSeleccionado = "Sábado";
    const selectDia = document.getElementById("select-dia-gestion");

    if (selectDia) {
        selectDia.addEventListener("change", (e) => {
            diaSeleccionado = e.target.value;
            cargarPanelJefeBarra();
        });
    }

    // === 2. CONTROL DE LOGOUT ===
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await _supabase.rpc('cerrar_sesion', { p_token: obtenerTokenSesion() });
            sessionStorage.clear();
            mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
        });
    }

    // === 3. FUNCIONES GLOBALES DE CONVOCATORIA, CRUD Y PROPINAS ===

    window.eliminarBartender = async (usernameKey) => {
        if (confirm(`¿Estás seguro de eliminar al bartender "${usernameKey}"?`)) {
            try {
                const { error } = await _supabase.rpc('admin_eliminar_usuario', {
                    p_token: obtenerTokenSesion(),
                    p_user_name: usernameKey
                });
                if (error) throw error;

                mostrarNotificacion("Bartender eliminado correctamente.", "exito");
                cargarPanelJefeBarra();
            } catch (err) {
                console.error("Error al eliminar bartender:", err);
                mostrarNotificacion("No se pudo eliminar el usuario.", "error");
            }
        }
    };

    window.guardarModificacionBartender = async (usernameOriginal) => {
        const nombreEditado = document.getElementById(`edit-bname-${usernameOriginal}`).value.trim();
        const usuarioEditado = document.getElementById(`edit-buser-${usernameOriginal}`).value.trim().toLowerCase();
        const passEditada = document.getElementById(`edit-bpass-${usernameOriginal}`).value;
        const telefonoEditado = document.getElementById(`edit-btelefono-${usernameOriginal}`).value.trim();
        const rolEditado = document.getElementById(`edit-brole-${usernameOriginal}`).value;

        try {
            // La contraseña ya NO se manda en este update: si el campo quedó vacío,
            // significa que no se quiso cambiar. Si se escribió una nueva, se fija
            // por separado con actualizar_password, que la hashea del lado del
            // servidor (nunca se guarda ni se muestra en texto plano). Ambas RPC
            // validan del lado del servidor que quien llama tiene un token de sesión
            // vigente con rol de administrador / jefe de barra.
            const { error } = await _supabase.rpc('admin_actualizar_usuario', {
                p_token: obtenerTokenSesion(),
                p_username_original: usernameOriginal,
                p_nombre_real: nombreEditado,
                p_user_name_nuevo: usuarioEditado,
                p_rol: rolEditado,
                p_telefono: telefonoEditado || null
            });

            if (error) throw error;

            if (passEditada) {
                const { error: errorPass } = await _supabase.rpc('actualizar_password', {
                    p_token: obtenerTokenSesion(),
                    p_user_name: usuarioEditado,
                    p_nueva_pass: passEditada
                });
                if (errorPass) throw errorPass;
            }

            mostrarNotificacion("Datos actualizados con éxito.", "exito");
            cargarPanelJefeBarra();
        } catch (err) {
            console.error("Error al actualizar bartender:", err);
            mostrarNotificacion("Error al actualizar usuario.", "error");
        }
    };

    window.alternarConvocatoriaBartender = async (username, estaConvocado) => {
        try {
            const { error } = await _supabase.rpc('gestion_convocatoria', {
                p_token: obtenerTokenSesion(),
                p_user_name: username,
                p_dia: diaSeleccionado,
                p_accion: estaConvocado ? 'quitar' : 'agregar',
                p_semana_lunes: semanaActualStr
            });

            if (error) throw error;
            mostrarNotificacion(estaConvocado ? "Bartender removido de la convocatoria." : "Bartender convocado con éxito.", "exito");

            cargarPanelJefeBarra();
        } catch (err) {
            console.error("Error al convocar bartender:", err);
            mostrarNotificacion("Error de conexión con Supabase.", "error");
        }
    };

    window.guardarSectorBartender = async (username, sectorVal) => {
        try {
            const { error } = await _supabase.rpc('gestion_sector_convocado', {
                p_token: obtenerTokenSesion(),
                p_user_name: username,
                p_dia: diaSeleccionado,
                p_sector: sectorVal,
                p_semana_lunes: semanaActualStr
            });

            if (error) throw error;
            mostrarNotificacion("Barra asignada correctamente.", "exito");
        } catch (err) {
            console.error("Error al actualizar sector de barra:", err);
            mostrarNotificacion("Error al guardar la barra asignada.", "error");
        }
    };

    // === GUARDAR PROPINA EN SUPABASE ===
    window.guardarPropinaBarra = async (sectorBarra, montoVal) => {
        try {
            const sectorLimpio = sectorBarra.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").trim();

            const { error } = await _supabase.rpc('gestion_propina_barra', {
                p_token: obtenerTokenSesion(),
                p_sector_barra: sectorLimpio,
                p_dia: diaSeleccionado,
                p_monto: Number(montoVal) || 0
            });

            if (error) throw error;
        } catch (err) {
            console.error("Error al guardar propina de barra:", err);
        }
    };

    // === EXPORTACIÓN DE BARRAS A GOOGLE SHEETS ===
    window.exportarBarraA_GoogleSheets = async () => {
        try {
            const mapaPropinasPantalla = {};
            const filasTabla = document.querySelectorAll('#tabla-propinas-sectores-body tr');

            for (const fila of filasTabla) {
                const tdSector = fila.querySelector('td');
                const inputMonto = fila.querySelector('input[type="number"]');
                if (tdSector && inputMonto) {
                    const sectorNombre = tdSector.textContent.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").trim();
                    const monto = Number(inputMonto.value) || 0;

                    mapaPropinasPantalla[sectorNombre.toLowerCase()] = monto;
                    guardarPropinaBarra(sectorNombre, monto);
                }
            }

            const hoy = new Date();
            const fechaDiariaExacta = hoy.toISOString().split('T')[0];

            const [resConvocados, resUsuarios] = await Promise.all([
                // Filtrado por semana actual: evita arrastrar convocatorias viejas
                // del mismo día (ej. "Viernes" de hace un mes) a la exportación de hoy.
                _supabase.from('convocados').select('*').eq('semana_lunes', semanaActualStr),
                _supabase.from('usuarios_public').select('user_name, nombre_real, rol')
            ]);

            if (resConvocados.error) throw resConvocados.error;
            if (resUsuarios.error) throw resUsuarios.error;

            const convocadosDB = resConvocados.data || [];
            const usuariosDB = resUsuarios.data || [];

            const normalizarTexto = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
            const diaActualNorm = normalizarTexto(diaSeleccionado);

            const bartendersConvocados = convocadosDB.filter(c => {
                const usr = usuariosDB.find(u => u.user_name === c.user_name);
                const esBartender = usr && usr.rol === 'bartender';
                const diaConvocadoNorm = normalizarTexto(c.dia || 'Sabado');
                return esBartender && (diaConvocadoNorm === diaActualNorm);
            });

            if (bartendersConvocados.length === 0) {
                mostrarNotificacion(`No hay bartenders convocados para el día ${diaSeleccionado}.`, "error");
                return;
            }

            const filasProcesadas = bartendersConvocados.map(item => {
                const datosUsuario = usuariosDB.find(u => u.user_name === item.user_name);
                const sectorOriginal = item.sector || 'Principal';
                const sectorKey = sectorOriginal.toLowerCase().trim();
                const montoFinal = mapaPropinasPantalla[sectorKey] !== undefined ? mapaPropinasPantalla[sectorKey] : 0;

                return {
                    semana: fechaDiariaExacta,
                    usuario: datosUsuario ? (datosUsuario.nombre_real || datosUsuario.user_name) : item.user_name,
                    rol: `Bartender (${diaSeleccionado})`,
                    sector: sectorOriginal,
                    propina: montoFinal
                };
            });

            mostrarNotificacion("Enviando reporte a Google Sheets...", "exito");

            await enviarConRespaldo(URL_WEBHOOK_SHEETS, { tipo: "barras", filas: filasProcesadas }, CLAVE_RESPALDO_EXPORT_BARRAS);
            verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_BARRAS, 'respaldo-pendiente-barras', URL_WEBHOOK_SHEETS);

            // Una vez exportado, las propinas vuelven a $0 (en pantalla y en la base)
            for (const fila of filasTabla) {
                const tdSector = fila.querySelector('td');
                const inputMonto = fila.querySelector('input[type="number"]');
                if (tdSector && inputMonto) {
                    inputMonto.value = 0;
                    const sectorNombre = tdSector.textContent.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").trim();
                    await guardarPropinaBarra(sectorNombre, 0);
                }
            }

            recalcularTotalPropinaBarras();
            mostrarNotificacion("Enviado. Revisá la planilla para confirmar que llegó. Las propinas se reiniciaron a $0.", "exito");
            iniciarCooldownBoton(document.getElementById('btn-exportar-barras'), COOLDOWN_EXPORT_MS, document.getElementById('estado-cooldown-export-barras'));

        } catch (err) {
            console.error("Error al exportar barras:", err);
            mostrarNotificacion("Ocurrió un error al exportar las barras. Se guardó un respaldo para reintentar.", "error");
            verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_BARRAS, 'respaldo-pendiente-barras', URL_WEBHOOK_SHEETS);
        }
    };

    // Suma en vivo lo que se ve en pantalla (no pega a la base): se recalcula
    // al renderizar el panel y cada vez que alguien toca un input de propina.
    function recalcularTotalPropinaBarras() {
        const total = [...document.querySelectorAll('.input-propina-barra')]
            .reduce((acc, input) => acc + (Number(input.value) || 0), 0);
        const elementoTotal = document.getElementById('total-propina-barras');
        if (elementoTotal) elementoTotal.innerText = total.toLocaleString('es-AR');
    }

    const tablaPropinasBodyEl = document.getElementById('tabla-propinas-sectores-body');
    if (tablaPropinasBodyEl) {
        tablaPropinasBodyEl.addEventListener('input', (e) => {
            if (e.target.classList.contains('input-propina-barra')) recalcularTotalPropinaBarras();
        });
    }

    // === 4. CARGA ASÍNCRONA DE DATOS ===
    async function cargarPanelJefeBarra() {
        try {
            const [resUsuarios, resAgendas, resConvocados] = await Promise.all([
                _supabase.from('usuarios_public').select('user_name, nombre_real, rol, telefono'),
                _supabase.from('agendas').select('*'),
                // Filtrado por semana actual: evita que una convocatoria vieja del
                // mismo día se mezcle con la de hoy.
                _supabase.from('convocados').select('*').eq('semana_lunes', semanaActualStr)
            ]);

            if (resUsuarios.error) throw resUsuarios.error;
            if (resAgendas.error) throw resAgendas.error;
            if (resConvocados.error) throw resConvocados.error;

            const usuariosDB = resUsuarios.data || [];
            const agendasDB = resAgendas.data || [];
            const convocadosDB = resConvocados.data || [];

            const listaBartenders = document.getElementById("lista-bartenders-confirmados");
            const contenedorEquipoFinal = document.getElementById("equipo-barra-final");
            const tablaPropinasBody = document.getElementById("tabla-propinas-sectores-body");
            const tablaCRUD = document.getElementById("tabla-bartenders-crud");

            if (listaBartenders) listaBartenders.innerHTML = "";
            if (contenedorEquipoFinal) contenedorEquipoFinal.innerHTML = "";
            if (tablaPropinasBody) tablaPropinasBody.innerHTML = "";
            if (tablaCRUD) tablaCRUD.innerHTML = "";

            let cuentaConvocados = 0;
            const claveDiaAgenda = diaSeleccionado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // RENDER PROPINAS POR SECTOR DE BARRA
            // Siempre arrancan en $0: no se precarga el último monto guardado.
            // Solo cambian si el Jefe de Barra las modifica manualmente en pantalla.
            sectoresBarra.forEach(barra => {
                if (tablaPropinasBody) {
                    tablaPropinasBody.innerHTML += `
                        <tr>
                            <td class="text-start ps-3 fw-bold text-info"><i class="bi bi-cup-straw me-2"></i>${barra}</td>
                            <td>
                                <div class="input-group input-group-sm mx-auto" style="max-width: 200px;">
                                    <span class="input-group-text bg-dark text-warning border-secondary">$</span>
                                    <input type="number" class="form-control bg-dark text-light border-secondary text-center input-propina-barra" value="0" onchange="guardarPropinaBarra('${barra}', this.value)">
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });

            // RENDER DE BARTENDERS: CONVOCADOS, DISPONIBLES Y CRUD (solo rol
            // 'bartender' - el Jefe de Barra es gestión, no personal convocable).
            usuariosDB.forEach(usuario => {
                const rolLimpio = (usuario.rol || "").toLowerCase().trim();
                // El Jefe de Barra (admin_barra) es un rol de gestión, no personal
                // convocable: no debe aparecer ni en disponibilidad/convocatoria ni
                // en el CRUD de este panel.
                const esBartender = rolLimpio === "bartender";

                if (esBartender && tablaCRUD) {
                    tablaCRUD.innerHTML += `
                        <tr>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-bname-${usuario.user_name}" value="${escaparHTML(usuario.nombre_real || '')}"></td>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center fw-bold text-info" id="edit-buser-${usuario.user_name}" value="${escaparHTML(usuario.user_name)}"></td>
                            <td><input type="password" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-bpass-${usuario.user_name}" placeholder="Dejar vacío para no cambiar" value="" autocomplete="new-password"></td>
                            <td><input type="tel" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-btelefono-${usuario.user_name}" placeholder="WhatsApp" value="${escaparHTML(usuario.telefono || '')}"></td>
                            <td>
                                <select class="form-select form-select-sm bg-dark text-light border-secondary text-center" id="edit-brole-${usuario.user_name}" disabled>
                                    <option value="bartender" selected>Bartender</option>
                                </select>
                                <small class="text-muted d-block mt-1">Para pasar a Jefe de Barra, contactá a un administrador.</small>
                            </td>
                            <td>
                                <div class="d-flex gap-2 justify-content-center">
                                    <button class="btn btn-sm btn-success px-2" onclick="guardarModificacionBartender('${usuario.user_name}')"><i class="bi bi-save"></i></button>
                                    <button class="btn btn-sm btn-danger px-2" onclick="eliminarBartender('${usuario.user_name}')"><i class="bi bi-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }

                if (esBartender) {
                    const nombreMostrar = usuario.nombre_real || usuario.user_name;
                    const agendaUsuario = agendasDB.find(a => a.user_name === usuario.user_name);

                    const registroConvocado = convocadosDB.find(c => c.user_name === usuario.user_name && (c.dia === diaSeleccionado || (!c.dia && diaSeleccionado === 'Sábado')));
                    const estaConvocado = !!registroConvocado;

                    // La disponibilidad solo cuenta si el día elegido todavía no pasó
                    // Y la agenda fue confirmada/actualizada dentro de la semana actual.
                    const estaDisponibleEsteDia = agendaUsuario
                        && agendaUsuario[claveDiaAgenda] === true
                        && estaDisponibilidadVigente(claveDiaAgenda, agendaUsuario.updated_at);

                    if (estaDisponibleEsteDia) {
                        if (estaConvocado && contenedorEquipoFinal) {
                            cuentaConvocados++;
                            const sectorActual = registroConvocado.sector || "Principal";

                            let optionsHTML = "";
                            sectoresBarra.forEach(s => {
                                optionsHTML += `<option value="${s}" ${s === sectorActual ? 'selected' : ''}>${s}</option>`;
                            });

                            const mensajeWhatsApp = `Hola ${usuario.nombre_real || usuario.user_name}! Te convocamos para trabajar el ${diaSeleccionado} en la barra ${sectorActual}. Cualquier consulta escribinos. - Mr. Johns`;
                            const linkWhatsApp = construirEnlaceWhatsApp(usuario.telefono, mensajeWhatsApp);
                            const botonWhatsApp = linkWhatsApp
                                ? `<a href="${linkWhatsApp}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-success py-1 px-2" title="Avisar por WhatsApp"><i class="bi bi-whatsapp"></i></a>`
                                : `<span class="btn btn-sm btn-outline-secondary py-1 px-2 disabled" title="Este usuario no tiene teléfono cargado"><i class="bi bi-whatsapp"></i></span>`;

                            contenedorEquipoFinal.innerHTML += `
                                <div class="list-group-item item-convocado-bartender d-flex flex-wrap justify-content-between align-items-center rounded-3 mb-2 border border-info p-2">
                                    <div class="fw-bold text-info me-3">
                                        <i class="bi bi-check-circle-fill me-1"></i>${escaparHTML(nombreMostrar)}
                                    </div>

                                    <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
                                        <div class="input-group input-group-sm" style="max-width: 230px;">
                                            <span class="input-group-text bg-dark text-secondary border-secondary"><i class="bi bi-geo-alt"></i></span>
                                            <select class="form-select form-select-sm bg-dark text-light border-secondary" onchange="guardarSectorBartender('${usuario.user_name}', this.value)">
                                                ${optionsHTML}
                                            </select>
                                        </div>

                                        ${botonWhatsApp}
                                        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="alternarConvocatoriaBartender('${usuario.user_name}', true)" title="Quitar">
                                            <i class="bi bi-person-dash"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }

                        const itemHTML = `
                            <div class="list-group-item list-group-item-custom d-flex justify-content-between align-items-center rounded-3 mb-2">
                                <div class="ms-2 me-auto">
                                    <div class="fw-bold text-light">${escaparHTML(nombreMostrar)}</div>
                                    <span class="${agendaUsuario.observaciones ? 'text-warning' : 'text-muted'} small">
                                        ${agendaUsuario.observaciones ? 'Nota: ' + escaparHTML(agendaUsuario.observaciones) : 'Sin observaciones.'}
                                    </span>
                                </div>
                                <button class="btn btn-sm ${estaConvocado ? 'btn-info text-dark' : 'btn-outline-info'} fw-bold px-3 py-1" onclick="alternarConvocatoriaBartender('${usuario.user_name}', ${estaConvocado})">
                                    ${estaConvocado ? '<i class="bi bi-person-check-fill"></i> Convocado' : '<i class="bi bi-person-plus"></i> Seleccionar'}
                                </button>
                            </div>
                        `;
                        if (listaBartenders) listaBartenders.innerHTML += itemHTML;
                    }
                }
            });

            if (contenedorEquipoFinal && cuentaConvocados === 0) {
                contenedorEquipoFinal.innerHTML = `<p class="text-muted small text-center my-2">No hay bartenders convocados para el ${diaSeleccionado}.</p>`;
            }

            renderizarGrillaSemanal(usuariosDB, agendasDB, convocadosDB, (rol) => rol === 'bartender', 'grilla-semanal-bartenders');
            recalcularTotalPropinaBarras();

        } catch (err) {
            console.error("Error al cargar panel de Jefe de Barra:", err);
            mostrarNotificacion("No se pudieron cargar los datos del panel. Reintentá recargando la página.", "error");
        }
    }

    await cargarPanelJefeBarra();

    // === 5. FORMULARIO DE ALTA DE NUEVO BARTENDER ===
    const formAlta = document.getElementById("formAltaBartender");
    if (formAlta) {
        formAlta.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("new-bartender-name").value.trim();
            const username = document.getElementById("new-bartender-username").value.trim().toLowerCase();
            const password = document.getElementById("new-bartender-password").value;
            const telefono = document.getElementById("new-bartender-telefono").value.trim();

            try {
                // Alta y contraseña se fijan en una sola llamada al servidor (que
                // valida el rol de quien llama y hashea la contraseña ahí mismo).
                const { error } = await _supabase.rpc('admin_crear_usuario', {
                    p_token: obtenerTokenSesion(),
                    p_user_name: username,
                    p_nombre_real: nombre,
                    p_rol: "bartender",
                    p_password: password,
                    p_telefono: telefono || null
                });

                if (error) {
                    mostrarNotificacion(`Error de Supabase: ${error.message}`, "error");
                    return;
                }

                mostrarNotificacion(`¡Bartender ${nombre} registrado con éxito!`, "exito");
                formAlta.reset();
                cargarPanelJefeBarra();

            } catch (err) {
                console.error("Error al dar de alta bartender:", err);
                mostrarNotificacion("Error crítico al registrar.", "error");
            }
        });
    }
});