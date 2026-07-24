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

    // === FUNCIONES GLOBALES ===
    window.eliminarUsuario = (usernameKey) => {
        if (confirm(`¿Estás seguro de que querés eliminar permanentemente al usuario "${usernameKey}"?`)) {
            let usuarios = JSON.parse(localStorage.getItem("usuariosDB")) || [];
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

            let propinas = JSON.parse(localStorage.getItem("propinasMozoStaff")) || {};
            delete propinas[usernameKey];
            localStorage.setItem("propinasMozoStaff", JSON.stringify(propinas));

            alert("Usuario eliminado correctamente.");
            window.location.reload();
        }
    };

    window.guardarModificacion = (usernameOriginal) => {
        const nombreEditado = document.getElementById(`edit-name-${usernameOriginal}`).value.trim();
        const usuarioEditado = document.getElementById(`edit-user-${usernameOriginal}`).value.trim().toLowerCase();
        const passEditada = document.getElementById(`edit-pass-${usernameOriginal}`).value;
        const rolEditado = document.getElementById(`edit-role-${usernameOriginal}`).value;

        if (!usuarioEditado) { alert("El usuario no puede quedar vacío."); return; }

        let usuarios = JSON.parse(localStorage.getItem("usuariosDB")) || [];
        if (usuarioEditado !== usernameOriginal && usuarios.some(u => u.user === usuarioEditado)) {
            alert("Ese nombre de usuario ya está ocupado.");
            return;
        }

        const index = usuarios.findIndex(u => u.user === usernameOriginal);
        if (index !== -1) {
            usuarios[index].nombreReal = nombreEditado;
            usuarios[index].user = usuarioEditado;
            usuarios[index].pass = passEditada;
            usuarios[index].rol = rolEditado;
            localStorage.setItem("usuariosDB", JSON.stringify(usuarios));

            // Migraciones de llaves en LocalStorage
            if (usuarioEditado !== usernameOriginal) {
                let agendas = JSON.parse(localStorage.getItem("agendasStaff")) || {};
                if (agendas[usernameOriginal]) { agendas[usuarioEditado] = agendas[usernameOriginal]; delete agendas[usernameOriginal]; localStorage.setItem("agendasStaff", JSON.stringify(agendas)); }

                let convocados = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
                if (convocados.includes(usernameOriginal)) { convocados = convocados.map(u => u === usernameOriginal ? usuarioEditado : u); localStorage.setItem("convocadosStaff", JSON.stringify(convocados)); }

                let sectores = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
                if (sectores[usernameOriginal]) { sectores[usuarioEditado] = sectores[usernameOriginal]; delete sectores[usernameOriginal]; localStorage.setItem("sectoresStaff", JSON.stringify(sectores)); }

                let propinas = JSON.parse(localStorage.getItem("propinasMozoStaff")) || {};
                if (propinas[usernameOriginal]) { propinas[usuarioEditado] = propinas[usernameOriginal]; delete propinas[usernameOriginal]; localStorage.setItem("propinasMozoStaff", JSON.stringify(propinas)); }
            }

            alert("Usuario modificado con éxito.");
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

    // FUNCIÓN: GUARDAR SECTOR INDIVIDUAL
    window.guardarSectorMozo = (username, sectorVal) => {
        let sectores = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
        sectores[username] = sectorVal;
        localStorage.setItem("sectoresStaff", JSON.stringify(sectores));
    };

    // FUNCIÓN: GUARDAR PROPINA INDIVIDUAL
    window.guardarPropinaMozo = (username, montoVal) => {
        let propinas = JSON.parse(localStorage.getItem("propinasMozoStaff")) || {};
        propinas[username] = montoVal;
        localStorage.setItem("propinasMozoStaff", JSON.stringify(propinas));
    };

    // === RENDERS Y CONTROL ===
    const usuariosDB = JSON.parse(localStorage.getItem("usuariosDB")) || [];
    const agendasDB = JSON.parse(localStorage.getItem("agendasStaff")) || {};
    const convocadosDB = JSON.parse(localStorage.getItem("convocadosStaff")) || [];
    const sectoresDB = JSON.parse(localStorage.getItem("sectoresStaff")) || {};
    const propinasDB = JSON.parse(localStorage.getItem("propinasMozoStaff")) || {};

    const listaMozos = document.getElementById("lista-mozos-confirmados");
    const listaPendientes = document.getElementById("lista-pendientes");
    const tablaCRUD = document.getElementById("tabla-usuarios-crud");
    const contenedorEquipoFinal = document.getElementById("equipo-convocado-final");

    if(listaMozos) listaMozos.innerHTML = "";
    if(listaPendientes) listaPendientes.innerHTML = "";
    if(tablaCRUD) tablaCRUD.innerHTML = "";
    if(contenedorEquipoFinal) contenedorEquipoFinal.innerHTML = "";

    let faltanConfirmar = [];
    let cuentaConvocados = 0;

    const opcionesSectores = ["Vip", "Vip/Warhol", "Warhol", "Extension/Altillo", "Principal", "Patio"];

    usuariosDB.forEach(usuario => {
        // 1. TABLA CRUD
        if (usuario.rol !== "super_admin" && tablaCRUD) {
            const filaHTML = `
                <tr>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-name-${usuario.user}" value="${usuario.nombreReal || ''}"></td>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center fw-bold text-warning" id="edit-user-${usuario.user}" value="${usuario.user}"></td>
                    <td><input type="text" class="form-control form-control-sm bg-dark text-light border-secondary text-center" id="edit-pass-${usuario.user}" value="${usuario.pass}"></td>
                    <td>
                        <select class="form-select form-select-sm bg-dark text-light border-secondary text-center" id="edit-role-${usuario.user}">
                            <option value="mozo" ${usuario.rol === 'mozo' ? 'selected' : ''}>Mozo</option>
                            <option value="bartender" ${usuario.rol === 'bartender' ? 'selected' : ''}>Bartender</option>
                            <option value="admin_barra" ${usuario.rol === 'admin_barra' ? 'selected' : ''}>Jefe de Barra</option>
                        </select>
                    </td>
                    <td>
                        <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-sm btn-success px-2" onclick="guardarModificacion('${usuario.user}')" title="Guardar"><i class="bi bi-save"></i></button>
                            <button class="btn btn-sm btn-danger px-2" onclick="eliminarUsuario('${usuario.user}')" title="Eliminar"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tablaCRUD.innerHTML += filaHTML;
        }

        // 2. FILTRADO Y CONVOCATORIA DE MOZOS
        if (usuario.rol === "mozo") {
            const nombreMostrar = usuario.nombreReal || usuario.user;
            const agendaUsuario = agendasDB[usuario.user];
            const estaConvocado = convocadosDB.includes(usuario.user);
            const sectorActual = sectoresDB[usuario.user] || "Principal";
            const propinaActual = propinasDB[usuario.user] || "0";

            if (agendaUsuario && agendaUsuario.dias && agendaUsuario.dias.sabado === true) {
                
                if (estaConvocado && contenedorEquipoFinal) {
                    cuentaConvocados++;
                    
                    let optionsHTML = "";
                    opcionesSectores.forEach(s => {
                        optionsHTML += `<option value="${s}" ${s === sectorActual ? 'selected' : ''}>${s}</option>`;
                    });

                    // Fila limpia de convocado con selector de sector e input de propina
                    contenedorEquipoFinal.innerHTML += `
                        <div class="list-group-item d-flex flex-wrap justify-content-between align-items-center rounded-3 mb-2 border border-success p-2" style="background-color: #121f15 !important;">
                            <div class="fw-bold text-success me-3">
                                <i class="bi bi-check-circle-fill me-1"></i>${nombreMostrar}
                            </div>
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
                                <!-- Selector de Sector -->
                                <div class="input-group input-group-sm" style="max-width: 170px;">
                                    <span class="input-group-text bg-dark text-secondary border-secondary"><i class="bi bi-geo-alt"></i></span>
                                    <select class="form-select form-select-sm bg-dark text-light border-secondary" onchange="guardarSectorMozo('${usuario.user}', this.value)">
                                        ${optionsHTML}
                                    </select>
                                </div>

                                <!-- Input Propina Individual -->
                                <div class="input-group input-group-sm" style="max-width: 140px;">
                                    <span class="input-group-text bg-dark text-warning border-secondary"><i class="bi bi-cash"></i></span>
                                    <input type="number" class="form-control bg-dark text-light border-secondary" placeholder="Propina $" value="${propinaActual}" onchange="guardarPropinaMozo('${usuario.user}', this.value)">
                                </div>

                                <!-- Botón Desconvocar -->
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
                        <button class="btn btn-sm ${estaConvocado ? 'btn-success' : 'btn-outline-warning'} fw-bold px-3 py-1" onclick="alternarConvocatoria('${usuario.user}')">
                            ${estaConvocado ? '<i class="bi bi-person-check-fill"></i> Convocado' : '<i class="bi bi-person-plus"></i> Seleccionar'}
                        </button>
                    </div>
                `;
                if (listaMozos) listaMozos.innerHTML += itemHTML;

            } else {
                faltanConfirmar.push(nombreMostrar);
            }
        }
    });

    if (contenedorEquipoFinal && cuentaConvocados === 0) {
        contenedorEquipoFinal.innerHTML = `<p class="text-muted small text-center my-2">No seleccionaste mozos para trabajar todavía.</p>`;
    }

    if (listaPendientes) {
        if (faltanConfirmar.length > 0) {
            listaPendientes.innerHTML = `
                <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-25 text-danger small mb-0 rounded-3" role="alert">
                    <i class="bi bi-x-circle-fill me-2"></i><strong>Falta confirmar disponibilidad:</strong> ${faltanConfirmar.join(", ")}.
                </div>
            `;
        } else {
            listaPendientes.innerHTML = `
                <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-25 text-success small mb-0 rounded-3" role="alert">
                    <i class="bi bi-check-circle-fill me-2"></i><strong>¡Mozo-listo!</strong> Todo tu equipo cargó su agenda.
                </div>
            `;
        }
    }

    // === ALTA DE NUEVO MOZO ===
    const formAlta = document.getElementById("formAltaPersonal");
    if (formAlta) {
        formAlta.addEventListener("submit", (e) => {
            e.preventDefault();
            const nombre = document.getElementById("new-name").value.trim();
            const username = document.getElementById("new-username").value.trim().toLowerCase();
            const password = document.getElementById("new-password").value;
            const rol = document.getElementById("new-role").value; // Leemos el rol seleccionado

            let usuariosActuales = JSON.parse(localStorage.getItem("usuariosDB")) || [];
            if (usuariosActuales.some(u => u.user === username)) { 
                alert("Este usuario ya existe."); 
                return; 
            }

            usuariosActuales.push({ user: username, pass: password, rol: rol, nombreReal: nombre });
            localStorage.setItem("usuariosDB", JSON.stringify(usuariosActuales));

            alert(`¡Usuario ${nombre} (${rol.toUpperCase()}) creado con éxito!`);
            formAlta.reset();
            window.location.reload(); 
        });
    }
});