document.addEventListener("DOMContentLoaded", () => {
    // === 1. IDENTIFICACIÓN DE USUARIO Y CONTROL DE SEGURIDAD ===
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario"); 

    if (!usuarioActivo) {
        alert("Acceso denegado. Por favor, iniciá sesión.");
        window.location.href = "login.html";
        return;
    }

    const usuariosDB = JSON.parse(localStorage.getItem("usuariosDB")) || [];
    const datosEsteUsuario = usuariosDB.find(u => u.user === usuarioActivo);
    
    const nombreCompleto = datosEsteUsuario && datosEsteUsuario.nombreReal 
        ? datosEsteUsuario.nombreReal 
        : usuarioActivo;

    const badgeRol = document.getElementById("user-role-badge");
    if (badgeRol && rolUsuario) {
        const puestoFormateado = rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1);
        badgeRol.innerText = `${nombreCompleto}: ${puestoFormateado}`;
    }

    // === 2. GENERACIÓN DE LA TABLA DE CONVOCADOS CON SECTOR / PUESTO ===
    const convocadosDB = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
    const sectoresDB = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
    const propinasDB = JSON.parse(localStorage.getItem("propinasMozoStaff")) || {};
    
    const seccionPlanilla = document.getElementById("seccion-convocados-planilla");
    const tablaConvocadosBody = document.getElementById("tabla-convocados-body");

    if (seccionPlanilla && tablaConvocadosBody) {
        tablaConvocadosBody.innerHTML = "";
        let hayConvocadosDeMiRol = false;

        usuariosDB.forEach(usuario => {
            if (convocadosDB.includes(usuario.user) && usuario.rol === rolUsuario) {
                hayConvocadosDeMiRol = true;
                
                const nombre = usuario.nombreReal || usuario.user;
                const esCeldaPropia = usuario.user === usuarioActivo;
                const sectorAsignado = sectoresDB[usuario.user] || "Principal";
                const propinaMozo = Number(propinasDB[usuario.user] || 0);

                const estiloBadge = usuario.rol === "mozo" 
                    ? "border-warning text-warning" 
                    : "border-info text-info";

                // Columna de propina solo para mozos
                const celdaPropinaHTML = usuario.rol === 'mozo' 
                    ? `<td class="text-warning fw-bold">$${propinaMozo.toLocaleString('es-AR')}</td>` 
                    : '';

                const filaHTML = `
                    <tr class="${esCeldaPropia ? 'table-active border-left border-success' : ''}">
                        <td class="fw-bold ${esCeldaPropia ? 'text-success' : 'text-light'} text-start ps-3">
                            ${nombre} ${esCeldaPropia ? '<span class="badge bg-success ms-2" style="font-size:0.65rem;">Vos</span>' : ''}
                        </td>
                        <td>
                            <span class="badge bg-dark border ${estiloBadge} text-uppercase px-2 py-1" style="font-size: 0.75rem;">
                                ${sectorAsignado}
                            </span>
                        </td>
                        ${celdaPropinaHTML}
                        <td>
                            <span class="text-success small fw-semibold"><i class="bi bi-check2-all me-1"></i> Convocado</span>
                        </td>
                    </tr>
                `;
                tablaConvocadosBody.innerHTML += filaHTML;
            }
        });

        if (hayConvocadosDeMiRol) {
            seccionPlanilla.classList.remove("d-none");
            
            // Adaptamos las cabeceras según si el rol que ingresó es mozo o bartender
            const tablaHeader = seccionPlanilla.querySelector("table thead tr");
            if (tablaHeader) {
                if (rolUsuario === 'mozo') {
                    tablaHeader.innerHTML = `
                        <th class="text-start ps-3">Personal</th>
                        <th>Sector</th>
                        <th>Propina</th>
                        <th>Estado</th>
                    `;
                } else {
                    tablaHeader.innerHTML = `
                        <th class="text-start ps-3">Personal</th>
                        <th>Barra</th>
                        <th>Estado</th>
                    `;
                }
            }
        } else {
            seccionPlanilla.classList.add("d-none");
        }
    }

    // === 3. CONTROL DE LOGOUT ===
    const ejecutarLogout = () => {
        sessionStorage.clear();
        alert("Sesión cerrada correctamente. ¡Buen descanso!");
        window.location.href = "login.html";
    };

    const btnLogoutPC = document.getElementById("btn-logout");
    const btnLogoutMobile = document.getElementById("btn-logout-mobile");

    if (btnLogoutPC) btnLogoutPC.addEventListener("click", ejecutarLogout);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener("click", ejecutarLogout);

    // === 4. PERSISTENCIA DE AGENDA SEMANAL INDIVIDUAL ===
    const formAgenda = document.getElementById("formAgendaStaff");

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

    const agendasDB = JSON.parse(localStorage.getItem("agendasStaff")) || {};
    
    if (agendasDB[usuarioActivo]) {
        const datosUsuario = agendasDB[usuarioActivo];
        Object.keys(diasIds).forEach(dia => {
            const checkbox = document.getElementById(diasIds[dia]);
            if (checkbox && datosUsuario.dias) {
                checkbox.checked = datosUsuario.dias[dia] || false;
            }
        });
        const inputObs = document.getElementById("observaciones");
        if (inputObs) { inputObs.value = datosUsuario.observaciones || ""; }
    }
    
    actualizarBadgesVisuales();

    Object.keys(diasIds).forEach(dia => {
        const checkbox = document.getElementById(diasIds[dia]);
        if (checkbox) { checkbox.addEventListener("change", actualizarBadgesVisuales); }
    });

    if (formAgenda) {
        formAgenda.addEventListener("submit", (e) => {
            e.preventDefault();

            const botonSubmit = document.getElementById("btn-submit-agenda");
            if (botonSubmit) {
                botonSubmit.disabled = true;
                botonSubmit.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> 
                    Guardando agenda...
                `;
            }

            const estadoDias = {};
            Object.keys(diasIds).forEach(dia => {
                const checkbox = document.getElementById(diasIds[dia]);
                estadoDias[dia] = checkbox ? checkbox.checked : false;
            });

            const nota = document.getElementById("observaciones").value.trim();

            setTimeout(() => {
                let todasLasAgendas = JSON.parse(localStorage.getItem("agendasStaff")) || {};
                todasLasAgendas[usuarioActivo] = {
                    dias: estadoDias,
                    observaciones: nota,
                    fechaActualizacion: new Date().toLocaleDateString()
                };
                localStorage.setItem("agendasStaff", JSON.stringify(todasLasAgendas));
                window.location.reload();
            }, 1000); 
        });
    }

    // === 5. ENFOQUE Y FILTRADO AUTOMÁTICO DE LA CARTA SEGÚN ROL ===
    if (rolUsuario === "bartender") {
        const tabBebidaElement = document.getElementById("bebida-tab");
        const tabComidaElement = document.getElementById("comida-tab");
        
        if (tabComidaElement) {
            tabComidaElement.parentElement.style.display = "none";
        }

        if (tabBebidaElement) {
            const tabBebida = new bootstrap.Tab(tabBebidaElement);
            tabBebida.show();
            tabBebidaElement.parentElement.style.width = "100%";
        }
    }
});