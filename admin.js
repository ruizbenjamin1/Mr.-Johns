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

document.addEventListener("DOMContentLoaded", async () => {
    
    // VERIFICACIÓN DE SEGURIDAD
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario");

    if (!usuarioActivo || (rolUsuario !== "super_admin" && rolUsuario !== "admin")) {
        mostrarNotificacion("Acceso denegado. Se requiere cuenta de Administrador.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    const opcionesSectores = ["Vip", "Vip/Warhol", "Warhol", "Extension/Altillo", "Principal", "Patio"];
    const URL_WEBHOOK_SHEETS = "https://script.google.com/macros/s/AKfycbzNq6zFAAEj7TTqdz5A78ZRcPhb8I80DlCm_F0E05T1lZWzuEkJ1aeStZb1K1vWM3X_UQ/exec";

    // === SEMANA ACTUAL (LUNES EN FORMATO YYYY-MM-DD) — usa la función global de supabase_client.js ===
    const semanaActualStr = obtenerLunesSemanaActual();

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
        btnLogout.addEventListener("click", () => {
            sessionStorage.clear();
            mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
        });
    }

    // === FUNCIONES GLOBALES CRUD & CONVOCATORIA ===

    window.eliminarUsuario = async (usernameKey) => {
        if (confirm(`¿Estás seguro de que querés eliminar permanentemente al usuario "${usernameKey}"?`)) {
            try {
                const { error } = await _supabase.from('usuarios').delete().eq('user_name', usernameKey);
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
        const rolEditado = document.getElementById(`edit-role-${usernameOriginal}`).value;

        if (!usuarioEditado) { 
            mostrarNotificacion("El usuario no puede quedar vacío.", "error"); 
            return; 
        }

        try {
            const { error } = await _supabase
                .from('usuarios')
                .update({ nombre_real: nombreEditado, user_name: usuarioEditado, pass: passEditada, rol: rolEditado })
                .eq('user_name', usernameOriginal);

            if (error) throw error;
            mostrarNotificacion("Usuario modificado con éxito.", "exito");
            cargarPanelAdmin();
        } catch (err) {
            console.error("Error al actualizar usuario:", err);
            mostrarNotificacion(`Error: ${err.message || JSON.stringify(err)}`, "error");
        }
    };

    // === CONVOCATORIA (AHORA ANCLADA A LA SEMANA ACTUAL) ===
    window.alternarConvocatoria = async (username, estaConvocado) => {
        try {
            if (estaConvocado) {
                const { error } = await _supabase
                    .from('convocados')
                    .delete()
                    .eq('user_name', username)
                    .eq('dia', diaSeleccionado)
                    .eq('semana', semanaActualStr);

                if (error) throw error;
                mostrarNotificacion("Mozo removido de la convocatoria.", "exito");
            } else {
                const { error } = await _supabase
                    .from('convocados')
                    .insert([
                        { user_name: username, sector: "Principal", propina_individual: 0, dia: diaSeleccionado, semana: semanaActualStr }
                    ]);

                if (error) throw error;
                mostrarNotificacion("Mozo convocado con éxito.", "exito");
            }

            cargarPanelAdmin();
        } catch (err) {
            console.error("Error en convocatoria:", err);
            mostrarNotificacion(`Error de Supabase: ${err.message || JSON.stringify(err)}`, "error");
        }
    };

    window.guardarSectorMozo = async (username, sectorVal) => {
        try {
            const { error } = await _supabase
                .from('convocados')
                .update({ sector: sectorVal })
                .eq('user_name', username)
                .eq('dia', diaSeleccionado)
                .eq('semana', semanaActualStr);

            if (error) throw error;
            mostrarNotificacion("Sector guardado correctamente.", "exito");
        } catch (err) {
            console.error("Error al actualizar sector:", err);
            mostrarNotificacion("Error al guardar el sector.", "error");
        }
    };

    window.guardarPropinaMozo = async (username, montoVal) => {
        try {
            const { error } = await _supabase
                .from('convocados')
                .update({ propina_individual: Number(montoVal) || 0 })
                .eq('user_name', username)
                .eq('dia', diaSeleccionado)
                .eq('semana', semanaActualStr);

            if (error) throw error;
        } catch (err) {
            console.error("Error al guardar propina:", err);
            mostrarNotificacion("Error al actualizar el monto de propina.", "error");
        }
    };

    // === EXPORTACIÓN DE MOZOS A GOOGLE SHEETS (FILTRADO POR SEMANA ACTUAL) ===
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

            const { data: convocados, error } = await _supabase
                .from('convocados')
                .select(`user_name, sector, propina_individual, semana, dia, usuarios (nombre_real, rol)`)
                .eq('semana', semanaActualStr);

            if (error) throw error;

            const normalizarTexto = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
            const diaActualNorm = normalizarTexto(diaSeleccionado);

            const mozosConvocados = (convocados || []).filter(c => {
                const esMozo = c.usuarios && c.usuarios.rol === 'mozo';
                const diaConvocadoNorm = normalizarTexto(c.dia || 'Sábado');
                return esMozo && (diaConvocadoNorm === diaActualNorm);
            });

            if (mozosConvocados.length === 0) {
                mostrarNotificacion(`No hay mozos convocados para el día ${diaSeleccionado}.`, "error");
                return;
            }

            const filasProcesadas = mozosConvocados.map(item => ({
                semana: semanaActualStr,
                usuario: item.usuarios.nombre_real || item.user_name,
                rol: `Mozo (${diaSeleccionado})`,
                sector: item.sector || 'Principal',
                propina: item.propina_individual || 0
            }));

            mostrarNotificacion("Enviando Reporte a Google Sheets...", "exito");

            await fetch(URL_WEBHOOK_SHEETS, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: "mozos", filas: filasProcesadas })
            });

            mostrarNotificacion("¡Reporte de Mozos exportado con éxito!", "exito");

        } catch (err) {
            console.error("Error al exportar mozos:", err);
            mostrarNotificacion("Ocurrió un error al exportar los mozos.", "error");
        }
    };

    // === CARGA ASÍNCRONA DE DATOS (CONVOCADOS FILTRADOS POR SEMANA ACTUAL) ===
    async function cargarPanelAdmin() {
        try {
            const [resUsuarios, resAgendas, resConvocados] = await Promise.all([
                _supabase.from('usuarios').select('*'),
                _supabase.from('agendas').select('*'),
                _supabase.from('convocados').select('*').eq('semana', semanaActualStr)
            ]);

            if (resUsuarios.error) throw resUsuarios.error;
            if (resAgendas.error) throw resAgendas.error;
            if (resConvocados.error) throw resConvocados.error;

            const usuariosDB = resUsuarios.data || [];
            const agendasDB = resAgendas.data || [];
            const convocadosDB = resConvocados.data || [];

            const listaMozos = document.getElementById("lista-mozos-confirmados");
            const tablaCRUD = document.getElementById("tabla-usuarios-crud");
            const contenedorEquipoFinal = document.getElementById("equipo-convocado-final");

            if(listaMozos) listaMozos.innerHTML = "";
            if(tablaCRUD) tablaCRUD.innerHTML = "";
            if(contenedorEquipoFinal) contenedorEquipoFinal.innerHTML = "";

            let cuentaConvocados = 0;

            // Mapea el día a minúsculas sin tildes para la agenda (ej: Miércoles -> miercoles)
            const claveDiaAgenda = diaSeleccionado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            usuariosDB.forEach(usuario => {
                // RENDER TABLA CRUD USUARIOS
                if (usuario.rol !== "super_admin" && tablaCRUD) {
                    const filaHTML = `
                        <tr>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-name-${usuario.user_name}" value="${usuario.nombre_real || ''}"></td>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center fw-bold text-warning" id="edit-user-${usuario.user_name}" value="${usuario.user_name}"></td>
                            <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-pass-${usuario.user_name}" value="${usuario.pass}"></td>
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
                    tablaCRUD.innerHTML += filaHTML;
                }

                if (usuario.rol === "mozo") {
                    const nombreMostrar = usuario.nombre_real || usuario.user_name;
                    const agendaUsuario = agendasDB.find(a => a.user_name === usuario.user_name);
                    
                    // Buscar si está convocado EL DÍA SELECCIONADO dentro de la SEMANA ACTUAL
                    const registroConvocado = convocadosDB.find(c => c.user_name === usuario.user_name && (c.dia === diaSeleccionado || (!c.dia && diaSeleccionado === 'Sábado')));
                    const estaConvocado = !!registroConvocado;

                    const estaDisponibleEsteDia = agendaUsuario && agendaUsuario[claveDiaAgenda] === true;

                    if (estaDisponibleEsteDia) {
                        if (estaConvocado && contenedorEquipoFinal) {
                            cuentaConvocados++;
                            const sectorActual = registroConvocado.sector || "Principal";
                            const propinaActual = registroConvocado.propina_individual || 0;

                            let optionsHTML = "";
                            opcionesSectores.forEach(s => {
                                optionsHTML += `<option value="${s}" ${s === sectorActual ? 'selected' : ''}>${s}</option>`;
                            });

                            contenedorEquipoFinal.innerHTML += `
                                <div class="list-group-item d-flex flex-wrap justify-content-between align-items-center rounded-3 mb-2 border border-success p-2" style="background-color: #121f15 !important;">
                                    <div class="fw-bold text-success me-3">
                                        <i class="bi bi-check-circle-fill me-1"></i>${nombreMostrar}
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
                                            <input type="number" class="form-control bg-dark text-light border-secondary" placeholder="Propina $" data-user="${usuario.user_name}" value="${propinaActual}" onchange="guardarPropinaMozo('${usuario.user_name}', this.value)">
                                        </div>

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
                                    <div class="fw-bold text-light">${nombreMostrar}</div>
                                    <span class="${agendaUsuario.observaciones ? 'text-warning' : 'text-muted'} small">
                                        ${agendaUsuario.observaciones ? 'Nota: ' + agendaUsuario.observaciones : 'Sin observaciones.'}
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
                contenedorEquipoFinal.innerHTML = `<p class="text-muted small text-center my-2">No seleccionaste mozos para trabajar el ${diaSeleccionado} todavía.</p>`;
            }

        } catch (err) {
            console.error("Error al cargar panel de Admin:", err);
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
            const rolSelect = document.getElementById("new-role");
            const rol = rolSelect ? rolSelect.value : "mozo";

            try {
                const { error } = await _supabase
                    .from('usuarios')
                    .insert([{ user_name: username, nombre_real: nombre, pass: password, rol: rol }]);

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