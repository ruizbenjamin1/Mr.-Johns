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

// === SEMANA ACTUAL (LUNES EN FORMATO YYYY-MM-DD) — usa la función global de supabase_client.js ===
const semanaActualStr = obtenerLunesSemanaActual();

document.addEventListener("DOMContentLoaded", async () => {
    
    // === 1. IDENTIFICACIÓN DE USUARIO Y CONTROL DE SEGURIDAD ===
    const usuarioActivo = sessionStorage.getItem("usuarioLogueado");
    const rolUsuario = sessionStorage.getItem("rolUsuario"); 

    if (!usuarioActivo) {
        mostrarNotificacion("Acceso denegado. Por favor, iniciá sesión.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    // === 2. CONTROL DE LOGOUT ===
    const ejecutarLogout = () => {
        sessionStorage.clear();
        mostrarNotificacion("Sesión cerrada correctamente. ¡Buen descanso!", "exito");
        setTimeout(() => { window.location.href = "index.html"; }, 1200);
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

    // === 5. CARGA ASÍNCRONA DE DATOS DESDE SUPABASE (CONVOCADOS FILTRADOS POR SEMANA ACTUAL) ===
    try {
        const [resUsuarios, resConvocados, resAgendaPropia] = await Promise.all([
            _supabase.from('usuarios').select('*'),
            _supabase.from('convocados').select('*').eq('semana', semanaActualStr),
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

        // === 6. RENDER DE PLANILLA DE CONVOCADOS ===
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

    // === 8. GESTIÓN DE LA CARTA Y GESTIÓN DE STOCK ===
    
    const listaComidasGlobal = [
        { nombre: "Bastoncitos de quesos crocantes", descripcion: "Rebozados de queso, acompañados de salsa de tomates frescos y cebolla morada.", etiqueta: null },
        { nombre: "Tequeños de queso", descripcion: "Rollitos de queso empanados, acompañados con salsa de la casa.", etiqueta: null },
        { nombre: "Papa Plomo Rellena", descripcion: "Con dados de pollo o lomo salteado con panceta ahumada y vegetales, queso crema, manteca saborizada, ciboulette, gratinada.", etiqueta: "SIN TACC" },
        { nombre: "Chalupa de Puebla", descripcion: "Base de tortilla super crocante, salteado de pollo con vegetales, guacamole, cebolla encurtida y queso crema de ciboulette.", etiqueta: null },
        { nombre: "Baba Ganoush", descripcion: "Pate de berenjenas asadas acompañado con pan pita, grisines, verduras frescas, esferas de queso y falafel.", etiqueta: null },
        { nombre: "Cazuela de quesos fundidos", descripcion: "Para los amantes del queso, los mejores queso argentinos fundidos acompañados de cubos de pan tostado, tomates cherries, albahaca, grisines y toque fresco de guacamole.", etiqueta: null },
        { nombre: "Rabas soufflé", descripcion: "Anillos de calamar fritos, acompañados de aderezo cítrico y mayo tabasco.", etiqueta: null },
        
        { nombre: "Picada Fría para 2", descripcion: "Queso tybo en fetas, cantimpalo, bondiola, jamón cocido, olivas verdes y negras, pinchos de queso tomates y rúcula, trufas de queso azul y tostadas saborizadas.", etiqueta: null },
        { nombre: "Picada Caliente para 2", descripcion: "Tequeños, bastones de mozzarella, croquetas de queso, trocitos de pollo KFC, papas fritas y salsas.", etiqueta: null },
        { nombre: "Tabla Finger Food para 4", descripcion: "Nuggets de pollo y carne con salsa cheddar y BBQ ahumada, pulpetines de roast beef con salsa tabasco, pinchos de queso, rúcula y tomates secos, trufas de queso azul y nueces, jamón cocido, frasco de quesos y pimientos ahumados.", etiqueta: null },

        { nombre: "Parrillero Argento Sandwich", descripcion: "Lomo, vegetales, tomates, rúcula y crema de pimientos.", etiqueta: null },
        { nombre: "Pollo KFC", descripcion: "Pechuguitas de pollo crocante estilo kentuky, papas fondue y salsa de mostaza y miel.", etiqueta: null },
        { nombre: "Quesadillas de pollo", descripcion: "Tortillas de trigo rellenas de pollo con quesos fundidos, cebollas caramelizadas, sour cream y pasta de frijoles.", etiqueta: null },
        { nombre: "Papas New York/Argenta", descripcion: "Papas con salsa cheddar y panceta crispy, tiritas de picana, pimientos asados y salsa de verdeo.", etiqueta: null },

        { nombre: "Espiral de lomo", descripcion: "Con tomates rúcula, queso parmigiano, olivas negras, papas rusticas con hierbas.", etiqueta: "SIN TACC" },
        { nombre: "Tiritas de pollo grilladas con hierbas", descripcion: "Sobre mézclum de hojas verdes y tomates quemados a la chapa y aderezo cítrico.", etiqueta: "SIN TACC" },
        { nombre: "Tournedó", descripcion: "Medallón de filet con manteca pomada de hiervas y papa plomo.", etiqueta: "SIN TACC" },
        { nombre: "Pollo al estilo oriental salteado al wok", descripcion: "Con vegetales de estación, salsa de soja, mix de semillas, arroz frito con maní.", etiqueta: "SIN TACC" },
        { nombre: "Burrito 2.0 fusión", descripcion: "Roll de carne, panceta y vegetales en tortilla mexicana gratinada con queso parmigiano servida sobre salsa cheddar y pico de gallo.", etiqueta: null },

        { nombre: "Pizza Mr Johns", descripcion: "Lengüeta con mozzarella, aceitunas negras, bondiola y morrones crema.", etiqueta: "SIN TACC" },
        { nombre: "Pizza 6 Quesos", descripcion: "Lengüeta con mozzarella, provolone, queso azul dambo, cheddar y chips crocantes de parmesano.", etiqueta: "SIN TACC" },
        { nombre: "Pizza Jackie Kennedy", descripcion: "Lengüeta con mozzarella, panceta, champignones y ciboulette.", etiqueta: "SIN TACC" },
        { nombre: "Pizza Super Caprese", descripcion: "Lengüeta con mozzarella, tomates secos, tomates cherries, albahaca fresca y con una sabrosa decoración de pesto genovés y de tomates secos.", etiqueta: "SIN TACC" },
        { nombre: "Pizza New York", descripcion: "Lengüeta con jamón ahumado, panceta, cantimpalo, carne y pimientos asados.", etiqueta: "SIN TACC" },

        { nombre: "Hamburguesa Mr Johns", descripcion: "3 medallones de carne de 100 grs, acompañados con salsa y aderezo mac secreto, panceta crocante y queso cheddar.", etiqueta: "SIN TACC" },
        { nombre: "Hamburguesa Cheddar Lake", descripcion: "2 medallones de carne de 100 grs, base de lago cheddar y polvo de panceta.", etiqueta: "SIN TACC" },
        { nombre: "Hamburguesa Oh la la Paris", descripcion: "2 medallones de carne de 100 grs, con queso azul derretido sobre champignones a la provenzal y cebollas caramelizadas.", etiqueta: "SIN TACC" },
        { nombre: "Hamburguesa Crispy Burger", descripcion: "2 medallones de carne de 100 grs, doble cheddar, salsa ahumada, coronados por esferas de queso crocante y cebollas crispy.", etiqueta: "SIN TACC" },

        { nombre: "Ensalada Cesar Curry", descripcion: "Ensalada de pollo grillado al curry, hojas verdes, croutons de pan de campo, queso parmesano, olivas negras y alineo cesars.", etiqueta: "SIN TACC" },
        { nombre: "Ensalada Tibia Caprese de trufas de queso", descripcion: "Ensalada de tomates cherries, trufas de queso y albahaca fresca sobre base de focaccia dorada con aceite de oliva acompañada por vinagreta de aceto balsámico y pomelo rosado.", etiqueta: "SIN TACC" },

        { nombre: "Copa Frutos Rojos", descripcion: "Mix de frutos rojos con merenguitos crocantes, crocante de almendras y helado de americana.", etiqueta: null },
        { nombre: "Brownie con Helado", descripcion: "Brownie con helado de americana, coronada con frutos rojos.", etiqueta: null }
    ];

    const listaBebidasGlobal = [
        { nombre: "Caipiroska", descripcion: "Ingredientes: 3 cubitos de limón, 3 Oz vodka skyy regular, 1 ½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta." },
        { nombre: "Caipirinha", descripcion: "Ingredientes: 3 cubitos de limón, 3 Oz cachaça (velho barreiro), 1½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta." },
        { nombre: "Caipiamada", descripcion: "Ingredientes: 3 cubitos de limón, 3 Oz vino tinto (callia), 1½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta." },
        { nombre: "Limonada común", descripcion: "Ingredientes: 3 cubitos de limón, 2 cucharadas de azúcar, 2 Oz jugo de limón, 3 Oz almíbar, un dash de agua. Método: Cocteleado. Cristalería: Copa Huracán. Decoración: Dos rodajas de limón y menta." },
        { nombre: "Negroni", descripcion: "Ingredientes: 1 Oz vermouth (carpano rosso), 1 Oz campari, 1 Oz gin london dry (beefeater 1L). Método: Refrescado. Cristalería: Old fashion. Decoración: Una rodaja de naranja." },
        { nombre: "Old Fashion", descripcion: "Ingredientes: 2 Oz Whisky (jim beam honey), Bitter Angostura, 4 cucharadas de azúcar. Método: Refrescado. Cristalería: Old fashion." },
        { nombre: "Boulevardier", descripcion: "Ingredientes: 1 Oz vermouth (carpano rosso), 1 Oz campari, 1 Oz whisky (jim beam honey). Método: Refrescado. Cristalería: Old fashion." },
        { nombre: "Martini", descripcion: "Ingredientes: 1½ Oz vermouth seco (martini), 2 Oz gin london dry (beefeater 1L). Método: Refrescado. Cristalería: Copa Martini." },
        { nombre: "Manhattan", descripcion: "Ingredientes: 1 Oz vermouth (carpano rosso), 2 Oz whisky (jim beam honey), 2 o 3 gotas de bitter angostura. Método: Refrescado. Cristalería: Copa Martini." },
        { nombre: "Aperol Spritz", descripcion: "Ingredientes: 2 o 3 Oz de aperol, Champagne de corte hasta que quede un dedo, agua con gas. Método: Directo. Cristalería: Copa aperol." },
        { nombre: "Campari Orange", descripcion: "Ingredientes: 2 o 3 Oz campari, completar el vaso con jugo de naranja. Método: Directo. Cristalería: Vaso Huevo." },
        { nombre: "Sex on the beach", descripcion: "Ingredientes: 2 Oz skyy reg, 1 Oz licor de durazno, jugo de naranja, granadina. Método: Directo. Cristalería: Copa Huracán." },
        { nombre: "Malibu Punch", descripcion: "Ingredientes: 2 o 3 Oz Malibu, jugo de naranja, granadina. Método: Directo. Cristalería: Copa Huracán." },
        { nombre: "Mojito Malibu", descripcion: "Ingredientes: 2 o 3 Oz Malibu, hojas de menta, azúcar, almíbar, limón, soda. Método: Construido. Cristalería: Vaso Huevo." },
        { nombre: "Mojito Cubano", descripcion: "Ingredientes: 2 o 3 Oz Ron blanco, hojas de menta, azúcar, almíbar, limón, soda. Método: Construido. Cristalería: Vaso Huevo." },
        { nombre: "Cuba Libre", descripcion: "Ingredientes: 2 o 3 Oz Ron dorado, jugo de limón, Coca-Cola. Método: Directo. Cristalería: Vaso Huevo." },
        { nombre: "Gancia Batido", descripcion: "Ingredientes: 2 o 3 Oz Gancia, jugo de limón, Almíbar. Método: Cocteleado. Cristalería: Vaso Huevo." },
        { nombre: "Pisco Sour", descripcion: "Ingredientes: 3 Oz Pisco, jugo de limón, almíbar. Método: Cocteleado y doble colado. Cristalería: Copa Martini." }
    ];

    // Listado completo de stock agrupado por categorías
    const listaStockGlobal = [
        { categoria: "CHAMPAGNE", nombre: "Champagne Baron B" },
        { categoria: "CHAMPAGNE", nombre: "Champagne Baron B rose" },
        { categoria: "CHAMPAGNE", nombre: "Champagne Mumm" },
        { categoria: "CHAMPAGNE", nombre: "Champagne Mumm lager" },
        { categoria: "CHAMPAGNE", nombre: "Chandon Delice" },
        { categoria: "CHAMPAGNE", nombre: "Chandon Delice Rose" },
        { categoria: "CHAMPAGNE", nombre: "Chandon Extra Brut" },
        { categoria: "CHAMPAGNE", nombre: "Chandon Aperitif" },
        { categoria: "CHAMPAGNE", nombre: "Champagne de corte (cúter/renas/callia, etc)" },
        { categoria: "CHAMPAGNE", nombre: "Espumante Callia" },

        { categoria: "VODKA ABSOLUT", nombre: "Absolut vodka swedish 700ml" },
        { categoria: "VODKA ABSOLUT", nombre: "Absolut clásico 500ml" },
        { categoria: "VODKA ABSOLUT", nombre: "Absolut saborizado" },
        { categoria: "VODKA ABSOLUT", nombre: "Absolut Tabasco" },

        { categoria: "VINOS", nombre: "Vino Callia" },
        { categoria: "VINOS", nombre: "Vino callia rose" },
        { categoria: "VINOS", nombre: "Vino Santa Julia" },
        { categoria: "VINOS", nombre: "Vino Cafayate" },
        { categoria: "VINOS", nombre: "Vino Chacabuco" },
        { categoria: "VINOS", nombre: "Vino Cafayate Malbec" },
        { categoria: "VINOS", nombre: "Vino Chico Zossi (todas las variedades)" },
        { categoria: "VINOS", nombre: "Vino Eugenio Bustos" },
        { categoria: "VINOS", nombre: "Vino La Linda" },
        { categoria: "VINOS", nombre: "Vino ö-61 Malbec" },
        { categoria: "VINOS", nombre: "Vino Rutini Malbec" },

        { categoria: "COCA COLA", nombre: "Coca cola vidrio 350ml" },
        { categoria: "COCA COLA", nombre: "Coca cola vidrio zero 350ml" },
        { categoria: "COCA COLA", nombre: "Gaseosa coca cola pet 375ml" },
        { categoria: "COCA COLA", nombre: "Gaseosa coca cola Zero pet 375ml" },
        { categoria: "COCA COLA", nombre: "Gaseosa coca cola 1.5L" },
        { categoria: "COCA COLA", nombre: "Gaseosa coca cola zero 1.5L" },

        { categoria: "SKYY", nombre: "Skyy (todas las presentaciones)" },

        { categoria: "ENERGIZANTE", nombre: "Energizante Red Bull 250 ml" },
        { categoria: "ENERGIZANTE", nombre: "Energizante Speed 250ml" },
        { categoria: "ENERGIZANTE", nombre: "Energizante Sugar Free 250ml" },
        { categoria: "ENERGIZANTE", nombre: "Energizante Red Bull Red 250ml" },
        { categoria: "ENERGIZANTE", nombre: "Energizante Red Bull green 250ml" },
        { categoria: "ENERGIZANTE", nombre: "Energizante Red Bull summer" },

        { categoria: "GIN", nombre: "Gin Bombay" },
        { categoria: "GIN", nombre: "Gin Bull Dog" },
        { categoria: "GIN", nombre: "Gin Spirito Blu" },
        { categoria: "GIN", nombre: "Gin Beefeater 1L" },
        { categoria: "GIN", nombre: "Gin Beefeater 700ml" },
        { categoria: "GIN", nombre: "Gin Beefeater Pink 700ml" },
        { categoria: "GIN", nombre: "Gin Beefeater Blood Orange 700ml" },

        { categoria: "FERNET", nombre: "Fernet Branca 750ml" },
        { categoria: "FERNET", nombre: "Fernet Branca 1lt" },
        { categoria: "FERNET", nombre: "Fernet Branca 450ml" },

        { categoria: "CERVEZA", nombre: "Cerveza Heineken 330ml" },
        { categoria: "CERVEZA", nombre: "Cerveza Miller 330cc" },
        { categoria: "CERVEZA", nombre: "Cerveza Imperial 300ml" },
        { categoria: "CERVEZA", nombre: "Cerveza Sin alcohol" },
        { categoria: "CERVEZA", nombre: "Cerveza Blue Moon" },

        { categoria: "AGUAS", nombre: "Agua mineral Benedictino s/gas" },
        { categoria: "AGUAS", nombre: "Agua mineral Palau s/gas" },
        { categoria: "AGUAS", nombre: "Agua mineral Villa del Sur s/gas" },
        { categoria: "AGUAS", nombre: "Agua tóxica schweppes 375ml" },
        { categoria: "AGUAS", nombre: "Agua tonica schweppes 310ml" },
        { categoria: "AGUAS", nombre: "Agua tónica 1,5L" },
        { categoria: "AGUAS", nombre: "Agua mineral Benedictino c/gas" }
    ];

    // Control de rol para bartenders / barra
    if (rolUsuario === "bartender" || rolUsuario === "barman" || rolUsuario === "administrador_barra" || rolUsuario === "admin_barra") {
        const tabComidaElement = document.getElementById("comida-tab");
        const tabBebidaElement = document.getElementById("bebida-tab");
        const tabStockLi = document.getElementById("tab-item-stock");
        
        if (tabComidaElement && tabComidaElement.parentElement) {
            tabComidaElement.parentElement.style.display = "none";
        }

        // Mostrar solapa de stock
        if (tabStockLi) {
            tabStockLi.classList.remove("d-none");
        }

        // Repartir espacio 50/50 para bebidas y stock
        const tabBebidaLi = document.getElementById("tab-item-bebida");
        if (tabBebidaLi) tabBebidaLi.style.width = "50%";
        if (tabStockLi) tabStockLi.style.width = "50%";

        if (tabBebidaElement) {
            const tabBebida = new bootstrap.Tab(tabBebidaElement);
            tabBebida.show();
        }

        // Renderizar tabla de stock inicial y final
        renderizarStock(listaStockGlobal);
    } else {
        renderizarComidas(listaComidasGlobal);
    }

    renderizarBebidas(listaBebidasGlobal);
    configurarBuscadoresCarta();

    function renderizarComidas(comidas) {
        const contenedor = document.getElementById("contenedorComidas");
        if (!contenedor) return;
        contenedor.innerHTML = "";

        if (comidas.length === 0) {
            contenedor.innerHTML = `<p class="text-muted small text-center py-2">No se encontraron platos.</p>`;
            return;
        }

        comidas.forEach(plato => {
            contenedor.innerHTML += `
                <div class="card card-custom p-3 mb-2 rounded-3" style="background-color: #16191c !important;">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="fw-bold mb-1 text-light">${plato.nombre}</h6>
                    </div>
                    <p class="text-muted small mb-2">${plato.descripcion}</p>
                    ${plato.etiqueta ? `<div><span class="badge bg-danger bg-opacity-25 text-danger border border-danger badge-allergen">${plato.etiqueta}</span></div>` : ''}
                </div>
            `;
        });
    }

    function renderizarBebidas(bebidas) {
        const contenedor = document.getElementById("contenedorBebidas");
        if (!contenedor) return;
        contenedor.innerHTML = "";

        if (bebidas.length === 0) {
            contenedor.innerHTML = `<p class="text-muted small text-center py-2">No se encontraron bebidas.</p>`;
            return;
        }

        bebidas.forEach(bebida => {
            contenedor.innerHTML += `
                <div class="card card-custom p-3 mb-2 rounded-3" style="background-color: #16191c !important;">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="fw-bold mb-1 text-light">${bebida.nombre}</h6>
                    </div>
                    <p class="text-muted small mb-2">${bebida.descripcion}</p>
                </div>
            `;
        });
    }

    function renderizarStock(items) {
        const contenedor = document.getElementById("tabla-stock-body");
        if (!contenedor) return;
        contenedor.innerHTML = "";

        if (items.length === 0) {
            contenedor.innerHTML = `<tr><td colspan="3" class="text-muted text-center py-2">No se encontraron productos.</td></tr>`;
            return;
        }

        let categoriaActual = "";
        items.forEach((item, index) => {
            if (item.categoria !== categoriaActual) {
                categoriaActual = item.categoria;
                contenedor.innerHTML += `
                    <tr class="table-secondary text-dark fw-bold">
                        <td colspan="3" class="text-start ps-3 text-uppercase" style="background-color: #2a2f35; color: #ffc107 !important;">
                            &mdash; ${categoriaActual} &mdash;
                        </td>
                    </tr>
                `;
            }

            contenedor.innerHTML += `
                <tr>
                    <td class="text-start ps-3 text-light">${item.nombre}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm bg-dark text-light border-secondary text-center input-stock-inicial" min="0" value="0">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm bg-dark text-light border-secondary text-center input-stock-final" min="0" value="0">
                    </td>
                </tr>
            `;
        });
    }

    // Buscador de Stock
    const buscadorStock = document.getElementById("buscadorStock");
    if (buscadorStock) {
        buscadorStock.addEventListener("input", (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const filtrados = listaStockGlobal.filter(i => 
                i.nombre.toLowerCase().includes(texto) || i.categoria.toLowerCase().includes(texto)
            );
            renderizarStock(filtrados);
        });
    }

    // ENVÍO DIRECTO DE STOCK A GOOGLE SHEETS
    const formPlanillaStock = document.getElementById("formPlanillaStock");
    if (formPlanillaStock) {
        formPlanillaStock.addEventListener("submit", async (e) => {
            e.preventDefault();

            const barra = document.getElementById("select-barra").value;
            const responsable = document.getElementById("input-nombre-stock").value.trim();

            if (!barra) {
                mostrarNotificacion("Por favor, seleccioná una barra.", "error");
                return;
            }

            if (!responsable) {
                mostrarNotificacion("Por favor, ingresá el nombre del responsable.", "error");
                return;
            }

            const botonSubmit = document.getElementById("btn-guardar-stock");
            if (botonSubmit) {
                botonSubmit.disabled = true;
                botonSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Enviando a Google Sheets...`;
            }

            // Recolectar datos de la tabla de stock
            const registrosStock = [];

            document.querySelectorAll(".input-stock-inicial").forEach((inputInicial, idx) => {
                const inputFinal = document.querySelectorAll(".input-stock-final")[idx];
                const tr = inputInicial.closest("tr");
                const nombreProducto = tr.querySelector("td").innerText;

                const valInicial = parseFloat(inputInicial.value) || 0;
                const valFinal = parseFloat(inputFinal.value) || 0;
                const diferencia = valInicial - valFinal;

                registrosStock.push({
                    semana: semanaActualStr,
                    barra: barra,
                    responsable: responsable,
                    producto: nombreProducto,
                    inicial: valInicial,
                    final: valFinal,
                    diferencia: diferencia,
                    fecha_envio: new Date().toLocaleString('es-AR')
                });
            });

            // URL nueva configurada para la pestaña Stock
            const URL_GOOGLE_SHEET = "https://script.google.com/macros/s/AKfycbycJG08ka_8BewGw3TxtwlRL1TZKz6BMP4jn2yY_PoWj8nVs8e4bbKWKDQCD5ecgymfVA/exec";

            try {
                const response = await fetch(URL_GOOGLE_SHEET, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(registrosStock)
                });

                mostrarNotificacion("¡Planilla de stock enviada a Google Sheets con éxito!", "exito");
                setTimeout(() => { window.location.reload(); }, 1500);

            } catch (err) {
                console.error("Error al enviar a Google Sheets:", err);
                mostrarNotificacion("Error al enviar los datos. Verificá la conexión.", "error");
                if (botonSubmit) {
                    botonSubmit.disabled = false;
                    botonSubmit.innerHTML = `<i class="bi bi-save2-fill me-2"></i>GUARDAR PLANILLA DE STOCK`;
                }
            }
        });
    }

    function configurarBuscadoresCarta() {
        const inputComida = document.getElementById("buscadorComida");
        if (inputComida) {
            inputComida.addEventListener("input", (e) => {
                const texto = e.target.value.toLowerCase().trim();
                const filtrados = listaComidasGlobal.filter(p => {
                    const nom = (p.nombre || "").toLowerCase();
                    const desc = (p.descripcion || "").toLowerCase();
                    return nom.includes(texto) || desc.includes(texto);
                });
                renderizarComidas(filtrados);
            });
        }

        const inputBebida = document.getElementById("buscadorBebida");
        if (inputBebida) {
            inputBebida.addEventListener("input", (e) => {
                const texto = e.target.value.toLowerCase().trim();
                const filtrados = listaBebidasGlobal.filter(b => {
                    const nom = (b.nombre || "").toLowerCase();
                    const desc = (b.descripcion || "").toLowerCase();
                    return nom.includes(texto) || desc.includes(texto);
                });
                renderizarBebidas(filtrados);
            });
        }
    }
});