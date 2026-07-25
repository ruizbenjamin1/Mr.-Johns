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
    
    // === 1. IDENTIFICACIÓN DE USUARIO Y CONTROL DE SEGURIDAD ===
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario"); 

    if (!usuarioActivo) {
        mostrarNotificacion("Acceso denegado. Por favor, iniciá sesión.", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
        return;
    }

    // === 2. CONTROL DE LOGOUT ===
    const ejecutarLogout = () => {
        sessionStorage.clear();
        mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
        setTimeout(() => { window.location.href = "login.html"; }, 1200);
    };

    const btnLogoutPC = document.getElementById("btn-logout");
    const btnLogoutMobile = document.getElementById("btn-logout-mobile");

    if (btnLogoutPC) btnLogoutPC.addEventListener("click", ejecutarLogout);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener("click", ejecutarLogout);

    // === 3. MANEJO DE BADGES Y CHECKBOXES DE LA AGENDA SEMANAL ===
    const diasIds = {
        lunes: "disp-lun",
        martes: "disp-mar",
        miercoles: "disp-mie",
        jueves: "disp-jue",
        viernes: "disp-vie",
        sabado: "disp-sab",
        domingo: "disp-dom"
    };

    const actualizarBadgesVisuales = () => {
        Object.keys(diasIds).forEach(dia => {
            const checkbox = document.getElementById(diasIds[dia]);
            const badge = document.getElementById(`badge-${dia}`);
            if (checkbox && badge) {
                if (checkbox.checked) {
                    badge.innerText = "¡Confirmado!";
                    badge.className = "badge bg-success bg-opacity-25 text-success border border-success small";
                } else {
                    badge.innerText = "No disponible";
                    badge.className = "badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 small";
                }
            }
        });
    };

    Object.keys(diasIds).forEach(dia => {
        const checkbox = document.getElementById(diasIds[dia]);
        if (checkbox) { 
            checkbox.addEventListener("change", actualizarBadgesVisuales); 
        }
    });

    // === 4. CÁLCULO DINÁMICO Y MOSTRAR RANGO DE FECHA DE LA SEMANA ===
    const obtenerRangoSemanaActual = () => {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diferenciaLunes = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        const lunes = new Date(hoy.setDate(diferenciaLunes));
        
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        const opcionesMes = { month: 'long' };
        const mesLunes = lunes.toLocaleDateString('es-AR', opcionesMes);
        const mesDomingo = domingo.toLocaleDateString('es-AR', opcionesMes);

        if (mesLunes === mesDomingo) {
            return `Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${mesLunes.charAt(0).toUpperCase() + mesLunes.slice(1)}`;
        } else {
            return `Semana del ${lunes.getDate()} de ${mesLunes} al ${domingo.getDate()} de ${mesDomingo}`;
        }
    };

    const elementoFecha = document.getElementById("texto-semana-actual");
    if (elementoFecha) {
        elementoFecha.innerText = obtenerRangoSemanaActual();
    }

    // === 5. CARGA ASÍNCRONA DE DATOS DESDE SUPABASE ===
    try {
        const [resUsuarios, resConvocados, resAgendaPropia] = await Promise.all([
            _supabase.from('usuarios').select('*'),
            _supabase.from('convocados').select('*'),
            _supabase.from('agendas').select('*').eq('user_name', usuarioActivo).maybeSingle()
        ]);

        if (resUsuarios.error) throw resUsuarios.error;
        if (resConvocados.error) throw resConvocados.error;

        const usuariosDB = resUsuarios.data || [];
        const convocadosDB = resConvocados.data || [];
        const agendaPropia = resAgendaPropia.data;

        // Mostrar Badge del Usuario Activo
        const datosEsteUsuario = usuariosDB.find(u => u.user_name === usuarioActivo);
        const nombreCompleto = datosEsteUsuario && datosEsteUsuario.nombre_real 
            ? datosEsteUsuario.nombre_real 
            : usuarioActivo;

        const badgeRol = document.getElementById("user-role-badge");
        if (badgeRol && rolUsuario) {
            const puestoFormateado = rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1);
            badgeRol.innerText = `${nombreCompleto}: ${puestoFormateado}`;
        }

        // Cargar estado previo de la Agenda del Usuario
        if (agendaPropia) {
            Object.keys(diasIds).forEach(dia => {
                const checkbox = document.getElementById(diasIds[dia]);
                if (checkbox) {
                    checkbox.checked = agendaPropia[dia] || false;
                }
            });
            const inputObs = document.getElementById("observaciones");
            if (inputObs) { 
                inputObs.value = agendaPropia.observaciones || ""; 
            }
        }
        actualizarBadgesVisuales();

        // === 6. RENDER DE PLANILLA DE CONVOCADOS (SIN PROPINA) ===
        const seccionPlanilla = document.getElementById("seccion-convocados-planilla");
        const tablaConvocadosBody = document.getElementById("tabla-convocados-body");

        if (seccionPlanilla && tablaConvocadosBody) {
            tablaConvocadosBody.innerHTML = "";
            let hayConvocadosDeMiRol = false;

            usuariosDB.forEach(usuario => {
                const registrosConvocados = convocadosDB.filter(c => c.user_name === usuario.user_name);

                if (registrosConvocados.length > 0 && usuario.rol === rolUsuario) {
                    hayConvocadosDeMiRol = true;
                    
                    registrosConvocados.forEach(registroConvocado => {
                        const nombre = usuario.nombre_real || usuario.user_name;
                        const esCeldaPropia = usuario.user_name === usuarioActivo;
                        const sectorAsignado = registroConvocado.sector || "Principal";
                        const diaAsignado = registroConvocado.dia || "Sábado";

                        const estiloBadge = usuario.rol === "mozo" 
                            ? "border-warning text-warning" 
                            : "border-info text-info";

                        const filaHTML = `
                            <tr class="${esCeldaPropia ? 'table-active border-left border-success' : ''}">
                                <td class="fw-bold ${esCeldaPropia ? 'text-success' : 'text-light'} text-start ps-3">
                                    ${nombre} ${esCeldaPropia ? '<span class="badge bg-success ms-2" style="font-size:0.65rem;">Vos</span>' : ''}
                                </td>
                                <td>
                                    <span class="badge bg-secondary text-light px-2 py-1">${diaAsignado}</span>
                                </td>
                                <td>
                                    <span class="badge bg-dark border ${estiloBadge} text-uppercase px-2 py-1" style="font-size: 0.75rem;">
                                        ${sectorAsignado}
                                    </span>
                                </td>
                                <td>
                                    <span class="text-success small fw-semibold"><i class="bi bi-check2-all me-1"></i> Convocado</span>
                                </td>
                            </tr>
                        `;
                        tablaConvocadosBody.innerHTML += filaHTML;
                    });
                }
            });

            if (hayConvocadosDeMiRol) {
                seccionPlanilla.classList.remove("d-none");
                const tablaHeader = seccionPlanilla.querySelector("table thead tr");
                if (tablaHeader) {
                    tablaHeader.innerHTML = `
                        <th class="text-start ps-3">Personal</th>
                        <th>Día</th>
                        <th>${rolUsuario === 'mozo' ? 'Sector' : 'Barra'}</th>
                        <th>Estado</th>
                    `;
                }
            } else {
                seccionPlanilla.classList.add("d-none");
            }
        }

    } catch (err) {
        console.error("Error al cargar datos del Dashboard desde Supabase:", err);
    }

    // === 7. GUARDAR / ACTUALIZAR AGENDA EN SUPABASE ===
    const formAgenda = document.getElementById("formAgendaStaff");
    if (formAgenda) {
        formAgenda.addEventListener("submit", async (e) => {
            e.preventDefault();

            const botonSubmit = document.getElementById("btn-submit-agenda");
            if (botonSubmit) {
                botonSubmit.disabled = true;
                botonSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Guardando...`;
            }

            const estadoDias = {};
            Object.keys(diasIds).forEach(dia => {
                const checkbox = document.getElementById(diasIds[dia]);
                estadoDias[dia] = checkbox ? checkbox.checked : false;
            });

            const notaInput = document.getElementById("observaciones");
            const nota = notaInput ? notaInput.value.trim() : "";

            try {
                const { data: agendaExistente } = await _supabase
                    .from('agendas')
                    .select('id')
                    .eq('user_name', usuarioActivo)
                    .maybeSingle();

                const objetoAgenda = {
                    user_name: usuarioActivo,
                    lunes: estadoDias.lunes,
                    martes: estadoDias.martes,
                    miercoles: estadoDias.miercoles,
                    jueves: estadoDias.jueves,
                    viernes: estadoDias.viernes,
                    sabado: estadoDias.sabado,
                    domingo: estadoDias.domingo,
                    observaciones: nota,
                    updated_at: new Date().toISOString()
                };

                let errorOp = null;

                if (agendaExistente) {
                    const { error } = await _supabase.from('agendas').update(objetoAgenda).eq('user_name', usuarioActivo);
                    errorOp = error;
                } else {
                    const { error } = await _supabase.from('agendas').insert([objetoAgenda]);
                    errorOp = error;
                }

                if (errorOp) {
                    mostrarNotificacion(`Error de Supabase: ${errorOp.message}`, "error");
                    if (botonSubmit) {
                        botonSubmit.disabled = false;
                        botonSubmit.innerHTML = `ACTUALIZAR AGENDA`;
                    }
                    return;
                }

                mostrarNotificacion("¡Tu disponibilidad semanal se guardó correctamente!", "exito");
                setTimeout(() => { window.location.reload(); }, 1200);

            } catch (err) {
                console.error("Error al guardar la agenda:", err);
                mostrarNotificacion(`Error crítico: ${err.message || JSON.stringify(err)}`, "error");
                if (botonSubmit) {
                    botonSubmit.disabled = false;
                    botonSubmit.innerHTML = `ACTUALIZAR AGENDA`;
                }
            }
        });
    }

    // === 8. ENFOQUE DE LA CARTA SEGÚN ROL ===
    if (rolUsuario === "bartender") {
        const tabBebidaElement = document.getElementById("bebida-tab");
        const tabComidaElement = document.getElementById("comida-tab");
        
        if (tabComidaElement) tabComidaElement.parentElement.style.display = "none";

        if (tabBebidaElement) {
            const tabBebida = new bootstrap.Tab(tabBebidaElement);
            tabBebida.show();
            tabBebidaElement.parentElement.style.width = "100%";
        }
    }
});