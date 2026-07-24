document.addEventListener("DOMContentLoaded", () => {
    
    // === CONTROL DE LOGOUT ===
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.clear();
            alert("Sesión cerrada correctamente. ¡Buen descanso!");
            window.location.href = "login.html";
        });
    }

    const opcionesSectoresBarra = ["Vip", "Cantina", "Principal", "Patio", "Altillo", "Barra Evento"];

    // === FUNCIONES GLOBALES (Bartenders) ===
    window.eliminarUsuario = (usernameKey) => {
        if (confirm(`¿Estás seguro de que querés eliminar permanentemente al bartender "${usernameKey}"?`)) {
            let usuarios = JSON.parse(localStorage.getItem("usuariosDB")) || [];
            
            const target = usuarios.find(u => u.user === usernameKey);
            if (target && target.rol !== "bartender") {
                alert("Acción denegada: Solo podés gestionar bartenders.");
                return;
            }

            usuarios = usuarios.filter(u => u.user !== usernameKey);
            localStorage.setItem("usuariosDB", JSON.stringify(usuarios));
            
            let agendas = JSON.parse(localStorage.getItem("agendasStaff")) || {};
            delete agendas[usernameKey];
            localStorage.setItem("agendasStaff", JSON.stringify(agendas));

            let convocados = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
            convocados = convocados.filter(u => u !== usernameKey);
            localStorage.setItem("convocadosStaff", JSON.stringify(convocados));

            let sectores = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
            delete sectores[usernameKey];
            localStorage.setItem("sectoresStaff", JSON.stringify(sectores));

            alert("Bartender eliminado correctamente.");
            window.location.reload();
        }
    };

    window.guardarModificacion = (usernameOriginal) => {
        const nombreEditado = document.getElementById(`edit-name-${usernameOriginal}`).value.trim();
        const usuarioEditado = document.getElementById(`edit-user-${usernameOriginal}`).value.trim().toLowerCase();
        const passEditada = document.getElementById(`edit-pass-${usernameOriginal}`).value;

        if (!usuarioEditado) { alert("El nombre de usuario no puede quedar vacío."); return; }

        let usuarios = JSON.parse(localStorage.getItem("usuariosDB")) || [];
        
        const target = usuarios.find(u => u.user === usernameOriginal);
        if (target && target.rol !== "bartender") { alert("Acción denegada."); return; }

        if (usuarioEditado !== usernameOriginal && usuarios.some(u => u.user === usuarioEditado)) {
            alert("Ese nombre de usuario ya está ocupado.");
            return;
        }

        const index = usuarios.findIndex(u => u.user === usernameOriginal);
        if (index !== -1) {
            usuarios[index].nombreReal = nombreEditado;
            usuarios[index].user = usuarioEditado;
            usuarios[index].pass = passEditada;
            localStorage.setItem("usuariosDB", JSON.stringify(usuarios));

            if (usuarioEditado !== usernameOriginal) {
                let agendas = JSON.parse(localStorage.getItem("agendasStaff")) || {};
                if (agendas[usernameOriginal]) { agendas[usuarioEditado] = agendas[usernameOriginal]; delete agendas[usernameOriginal]; localStorage.setItem("agendasStaff", JSON.stringify(agendas)); }

                let convocados = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
                if (convocados.includes(usernameOriginal)) { convocados = convocados.map(u => u === usernameOriginal ? usuarioEditado : u); localStorage.setItem("convocadosStaff", JSON.stringify(convocados)); }

                let sectores = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
                if (sectores[usernameOriginal]) { sectores[usuarioEditado] = sectores[usernameOriginal]; delete sectores[usernameOriginal]; localStorage.setItem("sectoresStaff", JSON.stringify(sectores)); }
            }

            alert("Datos de barra actualizados.");
            window.location.reload();
        }
    };

    window.alternarConvocatoria = (username) => {
        let convocados = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
        if (convocados.includes(username)) {
            convocados = convocados.filter(u => u !== username);
        } else {
            convocados.push(username);
        }
        localStorage.setItem("convocadosStaff", JSON.stringify(convocados));
        window.location.reload();
    };

    window.guardarSectorBartender = (username, sectorVal) => {
        let sectores = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
        sectores[username] = sectorVal;
        localStorage.setItem("sectoresStaff", JSON.stringify(sectores));
    };

    // FUNCIÓN: GUARDAR PROPINA POR SECTOR DE BARRA
    window.guardarPropinaSectorBarra = (sector, monto) => {
        let propinasSectores = JSON.parse(localStorage.getItem("propinasSectoresBarra")) || {};
        propinasSectores[sector] = monto;
        localStorage.setItem("propinasSectoresBarra", JSON.stringify(propinasSectores));
    };

    // === RENDERS Y CONTROL DE BARRA ===
    const usuariosDB = JSON.parse(localStorage.getItem("usuariosDB")) || [];
    const agendasDB = JSON.parse(localStorage.getItem("agendasStaff")) || {};
    const convocadosDB = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
    const sectoresDB = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
    const propinasSectoresDB = JSON.parse(localStorage.getItem("propinasSectoresBarra")) || {};

    const listaBartenders = document.getElementById("lista-bartenders-confirmados");
    const listaPendientesBarra = document.getElementById("lista-pendientes-barra");
    const tablaCRUD = document.getElementById("tabla-bartenders-crud");
    const contenedorEquipoFinal = document.getElementById("equipo-barra-final");
    const tablaPropinasBody = document.getElementById("tabla-propinas-sectores-body");

    if(listaBartenders) listaBartenders.innerHTML = "";
    if(listaPendientesBarra) listaPendientesBarra.innerHTML = "";
    if(tablaCRUD) tablaCRUD.innerHTML = "";
    if(contenedorEquipoFinal) contenedorEquipoFinal.innerHTML = "";
    if(tablaPropinasBody) tablaPropinasBody.innerHTML = "";

    // 1. RENDER DE TABLA DE PROPINAS POR SECTOR DE BARRA
    if (tablaPropinasBody) {
        opcionesSectoresBarra.forEach(sec => {
            const propinaActual = propinasSectoresDB[sec] || "0";
            const filaHTML = `
                <tr>
                    <td class="text-start ps-3 fw-bold text-info"><i class="bi bi-cup-straw me-2"></i>${sec}</td>
                    <td>
                        <div class="input-group input-group-sm mx-auto" style="max-width: 180px;">
                            <span class="input-group-text bg-dark text-info border-secondary">$</span>
                            <input type="number" class="form-control bg-dark text-light border-secondary text-center" 
                                placeholder="0" value="${propinaActual}" 
                                onchange="guardarPropinaSectorBarra('${sec}', this.value)">
                        </div>
                    </td>
                </tr>
            `;
            tablaPropinasBody.innerHTML += filaHTML;
        });
    }

    let faltanConfirmarBarra = [];
    let cuentaConvocadosBarra = 0;

    usuariosDB.forEach(usuario => {
        // 2. TABLA CRUD BARTENDERS
        if (usuario.rol === "bartender" && tablaCRUD) {
            const filaHTML = `
                <tr>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-name-${usuario.user}" value="${usuario.nombreReal || ''}"></td>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center fw-bold text-info" id="edit-user-${usuario.user}" value="${usuario.user}"></td>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-pass-${usuario.user}" value="${usuario.pass}"></td>
                    <td><span class="badge bg-dark border border-info text-info px-2 py-1 small">Bartender</span></td>
                    <td>
                        <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-sm btn-success px-2" onclick="guardarModificacion('${usuario.user}')"><i class="bi bi-save"></i></button>
                            <button class="btn btn-sm btn-danger px-2" onclick="eliminarUsuario('${usuario.user}')"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tablaCRUD.innerHTML += filaHTML;
        }

        // 3. DISPONIBILIDAD Y PUESTOS DE BARRA
        if (usuario.rol === "bartender") {
            const nombreMostrar = usuario.nombreReal || usuario.user;
            const agendaUsuario = agendasDB[usuario.user];
            const estaConvocado = convocadosDB.includes(usuario.user);
            const sectorActual = sectoresDB[usuario.user] || "Principal";

            if (agendaUsuario && agendaUsuario.dias && agendaUsuario.dias.sabado === true) {
                
                if (estaConvocado && contenedorEquipoFinal) {
                    cuentaConvocadosBarra++;

                    let optionsHTML = "";
                    opcionesSectoresBarra.forEach(s => {
                        optionsHTML += `<option value="${s}" ${s === sectorActual ? 'selected' : ''}>${s}</option>`;
                    });

                    contenedorEquipoFinal.innerHTML += `
                        <div class="list-group-item d-flex flex-wrap justify-content-between align-items-center rounded-3 mb-2 border border-info p-2" style="background-color: #132124 !important;">
                            <div class="fw-bold text-info me-3">
                                <i class="bi bi-check-circle-fill me-1"></i>${nombreMostrar}
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
                                <div class="input-group input-group-sm" style="max-width: 180px;">
                                    <span class="input-group-text bg-dark text-info border-secondary"><i class="bi bi-cup-straw"></i></span>
                                    <select class="form-select form-select-sm bg-dark text-light border-secondary" onchange="guardarSectorBartender('${usuario.user}', this.value)">
                                        ${optionsHTML}
                                    </select>
                                </div>

                                <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="alternarConvocatoria('${usuario.user}')" title="Quitar">
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
                        <button class="btn btn-sm ${estaConvocado ? 'btn-info text-dark' : 'btn-outline-info'} fw-bold px-3 py-1" onclick="alternarConvocatoria('${usuario.user}')">
                            ${estaConvocado ? '<i class="bi bi-person-check-fill"></i> Convocado' : '<i class="bi bi-person-plus"></i> Seleccionar'}
                        </button>
                    </div>
                `;
                if (listaBartenders) listaBartenders.innerHTML += itemHTML;

            } else {
                faltanConfirmarBarra.push(nombreMostrar);
            }
        }
    });

    if (contenedorEquipoFinal && cuentaConvocadosBarra === 0) {
        contenedorEquipoFinal.innerHTML = `<p class="text-muted small text-center my-2">No hay bartenders seleccionados para el turno todavía.</p>`;
    }

    if (listaPendientesBarra) {
        if (faltanConfirmarBarra.length > 0) {
            listaPendientesBarra.innerHTML = `
                <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-25 text-danger small mb-0 rounded-3" role="alert">
                    <i class="bi bi-x-circle-fill me-2"></i><strong>Falta confirmar disponibilidad:</strong> ${faltanConfirmarBarra.join(", ")}.
                </div>
            `;
        } else {
            listaPendientesBarra.innerHTML = `
                <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-25 text-success small mb-0 rounded-3" role="alert">
                    <i class="bi bi-check-circle-fill me-2"></i><strong>¡Barra Completa!</strong> Todos los bartenders cargaron su agenda.
                </div>
            `;
        }
    }

    // === FORMULARIO REGISTRAR NUEVO BARTENDER ===
    const formAlta = document.getElementById("formAltaBartender");
    if (formAlta) {
        formAlta.addEventListener("submit", (e) => {
            e.preventDefault();
            const nombre = document.getElementById("new-bartender-name").value.trim();
            const username = document.getElementById("new-bartender-username").value.trim().toLowerCase();
            const password = document.getElementById("new-bartender-password").value;

            let usuariosActuales = JSON.parse(localStorage.getItem("usuariosDB")) || [];
            if (usuariosActuales.some(u => u.user === username)) { alert("Este usuario ya existe."); return; }

            usuariosActuales.push({ user: username, pass: password, rol: "bartender", nombreReal: nombre });
            localStorage.setItem("usuariosDB", JSON.stringify(usuariosActuales));

            alert(`¡Bartender ${nombre} incorporado con éxito!`);
            formAlta.reset();
            window.location.reload(); 
        });
    }
});