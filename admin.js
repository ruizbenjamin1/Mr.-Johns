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
        alert(mensaje); // Fallback por seguridad
    }
}

// === SEMANA ACTUAL (LUNES EN FORMATO YYYY-MM-DD) ===
// Todas las convocatorias se etiquetan con esto para que una convocatoria de
// una semana vieja nunca se mezcle con la actual (antes solo se filtraba por
// día, y "Viernes" de hace un mes quedaba pegado con el "Viernes" de hoy).
const semanaActualStr = obtenerLunesSemanaActual();

document.addEventListener("DOMContentLoaded", async () => {
    inicializarToggleTema("btn-toggle-tema");

    // VERIFICACIÓN DE SEGURIDAD
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario");

    if (!usuarioActivo || (rolUsuario !== "super_admin" && rolUsuario !== "admin")) {
        mostrarNotificacion("Acceso denegado. Se requiere cuenta de Administrador.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    const opcionesSectores = ["Vip", "Vip/Warhol", "Warhol", "Extension/Altillo", "Principal", "Patio", "Cocina"];
    const URL_WEBHOOK_SHEETS = "https://script.google.com/macros/s/AKfycbw8u2MFzpmLOFzHkqasuDrFuBwhB8qDQSnSYX6xKY4p9SBllkOM14_UzuLF8nB2VnXWSQ/exec";
    const CLAVE_RESPALDO_EXPORT_MOZOS = "respaldoExportMozos";
    const COOLDOWN_EXPORT_MS = 2 * 60 * 1000; // 2 minutos, para evitar filas duplicadas por doble click
    verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_MOZOS, 'respaldo-pendiente-mozos', URL_WEBHOOK_SHEETS);

    // === CONTRASEÑA PARA VER LA TABLA DE PERSONAL REGISTRADO ===
    // Cambiá esta clave por la que quieras usar.
    const CLAVE_PANEL_REGISTRADOS = "boca.erome";

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

    configurarBloqueoRegistrados("usuarios", CLAVE_PANEL_REGISTRADOS);

    // === SELECTOR DE CATEGORÍA (Jefes / Mozos / Bartenders) ===
    function configurarSelectorCategoriaPersonal() {
        const botones = document.querySelectorAll(".btn-categoria-personal");
        const paneles = document.querySelectorAll(".categoria-personal-panel");

        const estilosCategoria = {
            jefes: { activo: ["btn-info", "text-dark"], inactivo: ["btn-outline-info"] },
            mozos: { activo: ["btn-warning", "text-dark"], inactivo: ["btn-outline-warning"] },
            bartenders: { activo: ["btn-light", "text-dark"], inactivo: ["btn-outline-light"] }
        };

        const mostrarCategoria = (categoria) => {
            paneles.forEach(panel => {
                panel.classList.toggle("d-none", panel.id !== `categoria-${categoria}`);
            });

            botones.forEach(btn => {
                const cat = btn.getAttribute("data-categoria");
                const estilos = estilosCategoria[cat];
                if (!estilos) return;
                btn.classList.remove(...estilos.activo, ...estilos.inactivo);
                btn.classList.add(...(cat === categoria ? estilos.activo : estilos.inactivo));
            });
        };

        botones.forEach(btn => {
            btn.addEventListener("click", () => mostrarCategoria(btn.getAttribute("data-categoria")));
        });

        if (botones.length > 0) {
            mostrarCategoria(botones[0].getAttribute("data-categoria"));
        }
    }

    configurarSelectorCategoriaPersonal();

    // ESTADO DEL DÍA SELECCIONADO PARA LA GESTIÓN
    let diaSeleccionado = "Sábado";
    const selectDia = document.getElementById("select-dia-gestion");

    if (selectDia) {
        selectDia.addEventListener("change", (e) => {
            diaSeleccionado = e.target.value;
            const badgeDia = document.getElementById("badge-dia-actual");
            if (badgeDia) badgeDia.innerText = diaSeleccionado;
            cargarPanelAdmin();
        });
    }

    // === CONTROL DE LOGOUT ===
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await _supabase.rpc('cerrar_sesion', { p_token: obtenerTokenSesion() });
            sessionStorage.clear();
            mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
        });
    }

    // === FUNCIONES GLOBALES CRUD & CONVOCATORIA ===

    window.eliminarUsuario = async (usernameKey) => {
        if (confirm(`¿Estás seguro de que querés eliminar permanentemente al usuario "${usernameKey}"?`)) {
            try {
                const { error } = await _supabase.rpc('admin_eliminar_usuario', {
                    p_token: obtenerTokenSesion(),
                    p_user_name: usernameKey
                });
                if (error) throw error;
                mostrarNotificacion("Usuario eliminado correctamente.", "exito");
                cargarPanelAdmin();
            } catch (err) {
                console.error("Error al eliminar usuario:", err);
                mostrarNotificacion("No se pudo eliminar el usuario.", "error");
            }
        }
    };

    window.guardarModificacion = async (usernameOriginal) => {
        const nombreEditado = document.getElementById(`edit-name-${usernameOriginal}`).value.trim();
        const usuarioEditado = document.getElementById(`edit-user-${usernameOriginal}`).value.trim().toLowerCase();
        const passEditada = document.getElementById(`edit-pass-${usernameOriginal}`).value;
        const telefonoEditado = document.getElementById(`edit-telefono-${usernameOriginal}`).value.trim();
        const rolEditado = document.getElementById(`edit-role-${usernameOriginal}`).value;

        if (!usuarioEditado) {
            mostrarNotificacion("El usuario no puede quedar vacío.", "error");
            return;
        }

        try {
            // La contraseña ya NO se manda en este update: si el campo quedó vacío,
            // significa que el admin no quiso cambiarla. Si escribió algo nuevo, se
            // fija por separado con la función actualizar_password, que la hashea
            // del lado del servidor (nunca se guarda ni se muestra en texto plano).
            // Ambas RPC validan del lado del servidor que quien llama tiene un token
            // de sesión vigente con rol de administrador.
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

            mostrarNotificacion("Usuario modificado con éxito.", "exito");
            cargarPanelAdmin();
        } catch (err) {
            console.error("Error al actualizar usuario:", err);
            mostrarNotificacion(`Error: ${err.message || JSON.stringify(err)}`, "error");
        }
    };

    window.alternarConvocatoria = async (username, estaConvocado) => {
        try {
            const { error } = await _supabase.rpc('gestion_convocatoria', {
                p_token: obtenerTokenSesion(),
                p_user_name: username,
                p_dia: diaSeleccionado,
                p_accion: estaConvocado ? 'quitar' : 'agregar',
                p_semana_lunes: semanaActualStr
            });

            if (error) throw error;
            mostrarNotificacion(estaConvocado ? "Personal removido de la convocatoria." : "Personal convocado con éxito.", "exito");

            cargarPanelAdmin();
        } catch (err) {
            console.error("Error en convocatoria:", err);
            mostrarNotificacion(`Error de Supabase: ${err.message || JSON.stringify(err)}`, "error");
        }
    };

    window.guardarSectorMozo = async (username, sectorVal) => {
        try {
            const { error } = await _supabase.rpc('gestion_sector_convocado', {
                p_token: obtenerTokenSesion(),
                p_user_name: username,
                p_dia: diaSeleccionado,
                p_sector: sectorVal,
                p_semana_lunes: semanaActualStr
            });

            if (error) throw error;
            mostrarNotificacion("Sector guardado correctamente.", "exito");
        } catch (err) {
            console.error("Error al actualizar sector:", err);
            mostrarNotificacion("Error al guardar el sector.", "error");
        }
    };

    window.guardarPropinaMozo = async (username, montoVal) => {
        try {
            const { error } = await _supabase.rpc('gestion_propina_convocado', {
                p_token: obtenerTokenSesion(),
                p_user_name: username,
                p_dia: diaSeleccionado,
                p_monto: Number(montoVal) || 0,
                p_semana_lunes: semanaActualStr
            });

            if (error) throw error;
        } catch (err) {
            console.error("Error al guardar propina:", err);
            mostrarNotificacion("Error al actualizar el monto de propina.", "error");
        }
    };

    window.exportarMozosA_GoogleSheets = async () => {
        try {
            const inputsPropinas = document.querySelectorAll('#equipo-convocado-final input[type="number"]');
            for (const input of inputsPropinas) {
                const username = input.getAttribute('data-user');
                const monto = Number(input.value) || 0;
                if (username) {
                    await guardarPropinaMozo(username, monto);
                }
            }

            const hoy = new Date();
            const fechaDiariaExacta = hoy.toISOString().split('T')[0];

            // Se consulta por separado (ya no se puede hacer join embebido contra
            // "usuarios", que quedó bloqueada del lado del cliente) y se cruza acá.
            // Filtrado por semana actual: evita arrastrar convocatorias viejas del
            // mismo día (ej. "Viernes" de hace un mes) a la exportación de hoy.
            const [resConvocados, resUsuarios] = await Promise.all([
                _supabase.from('convocados').select('user_name, sector, propina_individual, dia').eq('semana_lunes', semanaActualStr),
                _supabase.from('usuarios_public').select('user_name, nombre_real, rol')
            ]);

            if (resConvocados.error) throw resConvocados.error;
            if (resUsuarios.error) throw resUsuarios.error;

            const usuariosDBExport = resUsuarios.data || [];

            const normalizarTexto = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
            const diaActualNorm = normalizarTexto(diaSeleccionado);

            // Solo se exportan MOZOS (los bartenders se gestionan y exportan desde el panel de Jefe de Barra)
            const personalConvocado = (resConvocados.data || [])
                .map(c => ({ ...c, usuario: usuariosDBExport.find(u => u.user_name === c.user_name) }))
                .filter(c => {
                    const esMozo = c.usuario && c.usuario.rol === 'mozo';
                    const diaConvocadoNorm = normalizarTexto(c.dia || 'Sábado');
                    return esMozo && (diaConvocadoNorm === diaActualNorm);
                });

            if (personalConvocado.length === 0) {
                mostrarNotificacion(`No hay mozos convocados para el día ${diaSeleccionado}.`, "error");
                return;
            }

            const filasProcesadas = personalConvocado.map(item => ({
                semana: fechaDiariaExacta,
                usuario: item.usuario.nombre_real || item.user_name,
                rol: `${item.usuario.rol.charAt(0).toUpperCase() + item.usuario.rol.slice(1)} (${diaSeleccionado})`,
                sector: item.sector || 'Principal',
                propina: item.propina_individual || 0
            }));

            mostrarNotificacion("Enviando Reporte a Google Sheets...", "exito");
            await enviarConRespaldo(URL_WEBHOOK_SHEETS, { tipo: "staff", filas: filasProcesadas }, CLAVE_RESPALDO_EXPORT_MOZOS);
            mostrarNotificacion("Enviado. Revisá la planilla para confirmar que llegó.", "exito");
            verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_MOZOS, 'respaldo-pendiente-mozos', URL_WEBHOOK_SHEETS);
            iniciarCooldownBoton(document.getElementById('btn-exportar-mozos'), COOLDOWN_EXPORT_MS, document.getElementById('estado-cooldown-export-mozos'));
        } catch (err) {
            console.error("Error al exportar:", err);
            mostrarNotificacion("Ocurrió un error al exportar los datos. Se guardó un respaldo para reintentar.", "error");
            verificarEnvioPendiente(CLAVE_RESPALDO_EXPORT_MOZOS, 'respaldo-pendiente-mozos', URL_WEBHOOK_SHEETS);
        }
    };

    // Suma en vivo lo que se ve en pantalla (no pega a la base): se recalcula
    // al renderizar el panel y cada vez que alguien toca un input de propina.
    function recalcularTotalPropinaMozos() {
        const total = [...document.querySelectorAll('.input-propina-mozo')]
            .reduce((acc, input) => acc + (Number(input.value) || 0), 0);
        const elementoTotal = document.getElementById('total-propina-mozos');
        if (elementoTotal) elementoTotal.innerText = total.toLocaleString('es-AR');
    }

    const contenedorEquipoFinalEl = document.getElementById('equipo-convocado-final');
    if (contenedorEquipoFinalEl) {
        contenedorEquipoFinalEl.addEventListener('input', (e) => {
            if (e.target.classList.contains('input-propina-mozo')) recalcularTotalPropinaMozos();
        });
    }

    async function cargarPanelAdmin() {
        try {
            const [resUsuarios, resAgendas, resConvocados] = await Promise.all([
                // Se lee desde la vista "usuarios_public": no incluye pass_hash, y la
                // tabla real "usuarios" ya no es accesible directo desde el navegador.
                _supabase.from('usuarios_public').select('user_name, nombre_real, rol, telefono'),
                _supabase.from('agendas').select('*'),
                // Filtrado por semana actual: evita que una convocatoria vieja del
                // mismo día (ej. "Viernes" de hace un mes) se mezcle con la de hoy.
                _supabase.from('convocados').select('*').eq('semana_lunes', semanaActualStr)
            ]);

            if (resUsuarios.error) throw resUsuarios.error;
            if (resAgendas.error) throw resAgendas.error;
            if (resConvocados.error) throw resConvocados.error;

            const usuariosDB = resUsuarios.data || [];
            const agendasDB = resAgendas.data || [];
            const convocadosDB = resConvocados.data || [];

            const listaMozos = document.getElementById("lista-mozos-confirmados");
            const tablaCRUDJefes = document.getElementById("tabla-usuarios-crud-jefes");
            const tablaCRUDMozos = document.getElementById("tabla-usuarios-crud-mozos");
            const tablaCRUDBartenders = document.getElementById("tabla-usuarios-crud-bartenders");
            const contenedorEquipoFinal = document.getElementById("equipo-convocado-final");

            if(listaMozos) listaMozos.innerHTML = "";
            if(tablaCRUDJefes) tablaCRUDJefes.innerHTML = "";
            if(tablaCRUDMozos) tablaCRUDMozos.innerHTML = "";
            if(tablaCRUDBartenders) tablaCRUDBartenders.innerHTML = "";
            if(contenedorEquipoFinal) contenedorEquipoFinal.innerHTML = "";

            let cuentaConvocados = 0;
            const claveDiaAgenda = diaSeleccionado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // Elegimos a qué tabla va cada usuario según su rol (jefe de barra, mozo o bartender)
            const tablasCRUDPorRol = {
                admin_barra: tablaCRUDJefes,
                mozo: tablaCRUDMozos,
                bartender: tablaCRUDBartenders
            };

            usuariosDB.forEach(usuario => {
                const tablaDestino = tablasCRUDPorRol[usuario.rol];
                if (usuario.rol !== "super_admin" && tablaDestino) {
                    const filaHTML = `
                        <tr>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-name-${usuario.user_name}" value="${escaparHTML(usuario.nombre_real || '')}"></td>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center fw-bold text-warning" id="edit-user-${usuario.user_name}" value="${escaparHTML(usuario.user_name)}"></td>
                            <td><input type="password" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-pass-${usuario.user_name}" placeholder="Dejar vacío para no cambiar" value="" autocomplete="new-password"></td>
                            <td><input type="tel" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-telefono-${usuario.user_name}" placeholder="WhatsApp" value="${escaparHTML(usuario.telefono || '')}"></td>
                            <td>
                                <select class="form-select form-select-sm bg-dark text-light border-secondary text-center" id="edit-role-${usuario.user_name}">
                                    <option value="mozo" ${usuario.rol === 'mozo' ? 'selected' : ''}>Mozo</option>
                                    <option value="bartender" ${usuario.rol === 'bartender' ? 'selected' : ''}>Bartender</option>
                                    <option value="admin_barra" ${usuario.rol === 'admin_barra' ? 'selected' : ''}>Jefe de Barra</option>
                                </select>
                            </td>
                            <td>
                                <div class="d-flex gap-2 justify-content-center">
                                    <button class="btn btn-sm btn-success px-2" onclick="guardarModificacion('${usuario.user_name}')" title="Guardar"><i class="bi bi-save"></i></button>
                                    <button class="btn btn-sm btn-danger px-2" onclick="eliminarUsuario('${usuario.user_name}')" title="Eliminar"><i class="bi bi-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                    tablaDestino.innerHTML += filaHTML;
                }

                // El panel de Admin solo convoca MOZOS. Los bartenders se convocan
                // desde el panel de Jefe de Barra (jefe_barra.html).
                const esPersonal = usuario.rol === "mozo";
                if (esPersonal) {
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
                            const propinaActual = registroConvocado.propina_individual || 0;
                            let optionsHTML = "";
                            opcionesSectores.forEach(s => optionsHTML += `<option value="${s}" ${s === sectorActual ? 'selected' : ''}>${s}</option>`);

                            const mensajeWhatsApp = `Hola ${usuario.nombre_real || usuario.user_name}! Te convocamos para trabajar el ${diaSeleccionado} en el sector ${sectorActual}. Cualquier consulta escribinos. - Mr. Johns`;
                            const linkWhatsApp = construirEnlaceWhatsApp(usuario.telefono, mensajeWhatsApp);
                            const botonWhatsApp = linkWhatsApp
                                ? `<a href="${linkWhatsApp}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-success py-1 px-2" title="Avisar por WhatsApp"><i class="bi bi-whatsapp"></i></a>`
                                : `<span class="btn btn-sm btn-outline-secondary py-1 px-2 disabled" title="Este usuario no tiene teléfono cargado"><i class="bi bi-whatsapp"></i></span>`;

                            contenedorEquipoFinal.innerHTML += `
                                <div class="list-group-item item-convocado-mozo d-flex flex-wrap justify-content-between align-items-center rounded-3 mb-2 border border-success p-2">
                                    <div class="fw-bold text-success me-3">
                                        <i class="bi bi-check-circle-fill me-1"></i>${escaparHTML(nombreMostrar)} <small class="text-secondary">(${usuario.rol})</small>
                                    </div>
                                    <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
                                        <div class="input-group input-group-sm" style="max-width: 170px;">
                                            <span class="input-group-text bg-dark text-secondary border-secondary"><i class="bi bi-geo-alt"></i></span>
                                            <select class="form-select form-select-sm bg-dark text-light border-secondary" onchange="guardarSectorMozo('${usuario.user_name}', this.value)">
                                                ${optionsHTML}
                                            </select>
                                        </div>
                                        <div class="input-group input-group-sm" style="max-width: 140px;">
                                            <span class="input-group-text bg-dark text-warning border-secondary"><i class="bi bi-cash"></i></span>
                                            <input type="number" class="form-control bg-dark text-light border-secondary input-propina-mozo" placeholder="Propina $" data-user="${usuario.user_name}" value="${propinaActual}" onchange="guardarPropinaMozo('${usuario.user_name}', this.value)">
                                        </div>
                                        ${botonWhatsApp}
                                        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="alternarConvocatoria('${usuario.user_name}', true)" title="Quitar">
                                            <i class="bi bi-person-dash"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }

                        const itemHTML = `
                            <div class="list-group-item list-group-item-custom d-flex justify-content-between align-items-center rounded-3 mb-2">
                                <div class="ms-2 me-auto">
                                    <div class="fw-bold text-light">${escaparHTML(nombreMostrar)} <small class="text-secondary">(${usuario.rol})</small></div>
                                    <span class="${agendaUsuario.observaciones ? 'text-warning' : 'text-muted'} small">
                                        ${agendaUsuario.observaciones ? 'Nota: ' + escaparHTML(agendaUsuario.observaciones) : 'Sin observaciones.'}
                                    </span>
                                </div>
                                <button class="btn btn-sm ${estaConvocado ? 'btn-success' : 'btn-outline-warning'} fw-bold px-3 py-1" onclick="alternarConvocatoria('${usuario.user_name}', ${estaConvocado})">
                                    ${estaConvocado ? '<i class="bi bi-person-check-fill"></i> Convocado' : '<i class="bi bi-person-plus"></i> Seleccionar'}
                                </button>
                            </div>
                        `;
                        if (listaMozos) listaMozos.innerHTML += itemHTML;
                    }
                }
            });

            if (contenedorEquipoFinal && cuentaConvocados === 0) {
                contenedorEquipoFinal.innerHTML = `<p class="text-muted small text-center my-2">No seleccionaste personal para trabajar el ${diaSeleccionado} todavía.</p>`;
            }

            renderizarGrillaSemanal(usuariosDB, agendasDB, convocadosDB, (rol) => rol === 'mozo', 'grilla-semanal-mozos');
            recalcularTotalPropinaMozos();
        } catch (err) {
            console.error("Error al cargar panel de Admin:", err);
            mostrarNotificacion("No se pudieron cargar los datos del panel. Reintentá recargando la página.", "error");
        }
    }

    await cargarPanelAdmin();

    // FORMULARIO DE ALTA DE PERSONAL
    const formAlta = document.getElementById("formAltaPersonal");
    if (formAlta) {
        formAlta.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("new-name").value.trim();
            const username = document.getElementById("new-username").value.trim().toLowerCase();
            const password = document.getElementById("new-password").value;
            const telefono = document.getElementById("new-telefono").value.trim();
            const rolSelect = document.getElementById("new-role");
            const rol = rolSelect ? rolSelect.value : "mozo";

            try {
                // Alta y contraseña se fijan en una sola llamada al servidor (que
                // valida el rol de quien llama y hashea la contraseña ahí mismo).
                const { error } = await _supabase.rpc('admin_crear_usuario', {
                    p_token: obtenerTokenSesion(),
                    p_user_name: username,
                    p_nombre_real: nombre,
                    p_rol: rol,
                    p_password: password,
                    p_telefono: telefono || null
                });

                if (error) {
                    mostrarNotificacion(`Error de Supabase: ${error.message}`, "error");
                    return;
                }

                mostrarNotificacion(`¡Usuario ${nombre} (${rol.toUpperCase()}) creado con éxito!`, "exito");
                formAlta.reset();
                cargarPanelAdmin();

            } catch (err) {
                console.error("Error al dar de alta usuario:", err);
                mostrarNotificacion(`Error crítico al registrar: ${err.message || JSON.stringify(err)}`, "error");
            }
        });
    }
});