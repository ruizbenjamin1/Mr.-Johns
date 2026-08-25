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
    const ejecutarLogout = async () => {
        await _supabase.rpc('cerrar_sesion', { p_token: obtenerTokenSesion() });
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
                if (checkbox.disabled) {
                    // El día ya pasó esta semana: la disponibilidad quedó "borrada" y bloqueada
                    badge.innerText = "Turno finalizado";
                    badge.className = "badge bg-secondary bg-opacity-25 text-secondary border border-secondary small";
                } else if (checkbox.checked) {
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

    // === 4. CÁLCULO DINÁMICO DE FECHA Y DÍA ACTUAL ===
    // Usamos obtenerFechaOperativa() (definida en supabase_client.js) en vez de
    // "new Date()" directo: el turno sigue siendo el de "anoche" hasta las 6 AM,
    // así la tarjeta de "Convocado Hoy" no desaparece a mitad del turno.
    const diasSemanaNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoyIndex = obtenerFechaOperativa().getDay();
    const diaActualNombre = diasSemanaNombres[hoyIndex]; // Ejemplo: "Viernes" o "Sábado"

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
            _supabase.from('usuarios_public').select('*'),
            // Filtrado por semana actual: evita mostrar una convocatoria vieja del
            // mismo día (ej. "Viernes" de hace un mes) como si fuera de hoy.
            _supabase.from('convocados').select('*').eq('semana_lunes', semanaActualStr),
            _supabase.from('agendas').select('*').eq('user_name', usuarioActivo.toLowerCase().trim()).maybeSingle()
        ]);

        if (resUsuarios.error) throw resUsuarios.error;
        if (resConvocados.error) throw resConvocados.error;

        const usuariosDB = resUsuarios.data || [];
        const convocadosDB = resConvocados.data || [];
        const agendaPropia = resAgendaPropia.data;

        // Mostrar Badge del Usuario Activo
        const usuarioLimpio = usuarioActivo.toLowerCase().trim();
        const datosEsteUsuario = usuariosDB.find(u => (u.user_name || "").toLowerCase().trim() === usuarioLimpio);
        const nombreCompleto = datosEsteUsuario && datosEsteUsuario.nombre_real
            ? datosEsteUsuario.nombre_real
            : usuarioActivo;

        const badgeRol = document.getElementById("user-role-badge");
        if (badgeRol && datosEsteUsuario) {
            const puestoFormateado = (datosEsteUsuario.rol || "").charAt(0).toUpperCase() + (datosEsteUsuario.rol || "").slice(1);
            badgeRol.innerText = `${nombreCompleto}: ${puestoFormateado}`;
        }

        // Cargar estado previo de la Agenda Semanal del Usuario
        // REGLA NUEVA: cada día que ya pasó esta semana se bloquea y se muestra sin confirmar
        // (se "borra" automáticamente). Si la agenda guardada es de una semana anterior,
        // se ignora y arranca en blanco para que el empleado la vuelva a completar.
        Object.keys(diasIds).forEach(dia => {
            const checkbox = document.getElementById(diasIds[dia]);
            if (!checkbox) return;

            const diaYaPaso = yaPasoEsteDiaEnLaSemana(dia);
            checkbox.disabled = diaYaPaso;

            if (diaYaPaso) {
                // Día vencido: se borra y queda bloqueado para no poder re-marcarlo
                checkbox.checked = false;
            } else if (agendaPropia && estaDisponibilidadVigente(dia, agendaPropia.updated_at)) {
                // Día futuro (o de hoy) y la agenda es de esta misma semana: respetamos lo guardado
                checkbox.checked = agendaPropia[dia] || false;
            } else {
                // Semana nueva (o nunca completó la agenda): arranca sin confirmar
                checkbox.checked = false;
            }
        });

        const inputObs = document.getElementById("observaciones");
        if (inputObs) {
            const semanaDeLaAgenda = agendaPropia && agendaPropia.updated_at ? obtenerLunesDeFecha(agendaPropia.updated_at) : null;
            const notaVigente = semanaDeLaAgenda === semanaActualStr;
            inputObs.value = notaVigente ? (agendaPropia.observaciones || "") : "";
        }

        actualizarBadgesVisuales();

        // === 6. RENDER DE PLANILLA DE CONVOCADOS (FILTRADO ESTRICTAMENTE POR EL DÍA DE HOY) ===
        const seccionPlanilla = document.getElementById("seccion-convocados-planilla");
        const tablaConvocadosBody = document.getElementById("tabla-convocados-body");

        if (seccionPlanilla && tablaConvocadosBody) {
            tablaConvocadosBody.innerHTML = "";

            // Buscamos las convocatorias del usuario que coincidan tanto con su usuario como con el DÍA DE HOY
            const normalizadorTexto = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const diaHoyNorm = normalizadorTexto(diaActualNombre);

            const misConvocatoriasHoy = convocadosDB.filter(c => {
                const esMiUsuario = (c.user_name || "").toLowerCase().trim() === usuarioLimpio;
                const diaConvocadoNorm = normalizadorTexto(c.dia || 'Sábado');
                return esMiUsuario && (diaConvocadoNorm === diaHoyNorm);
            });

            if (misConvocatoriasHoy.length > 0 && datosEsteUsuario) {
                seccionPlanilla.classList.remove("d-none");

                const tablaHeader = seccionPlanilla.querySelector("table thead tr");
                const rolReal = (datosEsteUsuario.rol || "").toLowerCase();
                const esBartender = rolReal.includes("bar");

                if (tablaHeader) {
                    tablaHeader.innerHTML = `
                        <th class="text-start ps-3">Personal</th>
                        <th>Día</th>
                        <th>${esBartender ? 'Barra' : 'Sector'}</th>
                        <th>Estado</th>
                    `;
                }

                misConvocatoriasHoy.forEach(registroConvocado => {
                    const nombre = datosEsteUsuario.nombre_real || usuarioActivo;
                    const sectorAsignado = registroConvocado.sector || "Principal";
                    const diaAsignado = registroConvocado.dia || diaActualNombre;

                    const estiloBadge = esBartender
                        ? "border-info text-info"
                        : "border-warning text-warning";

                    const filaHTML = `
                        <tr class="table-active border-left border-success">
                            <td class="fw-bold text-success text-start ps-3">
                                ${nombre} <span class="badge bg-success ms-2" style="font-size:0.65rem;">Vos (Hoy)</span>
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
                                <span class="text-success small fw-semibold"><i class="bi bi-check2-all me-1"></i> Convocado Hoy</span>
                            </td>
                        </tr>
                    `;
                    tablaConvocadosBody.innerHTML += filaHTML;
                });
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
                // Los días ya vencidos (checkbox.disabled) siempre se guardan como false,
                // así queda "borrada" la disponibilidad de un día que ya pasó.
                estadoDias[dia] = checkbox && !checkbox.disabled ? checkbox.checked : false;
            });

            const notaInput = document.getElementById("observaciones");
            const nota = notaInput ? notaInput.value.trim() : "";

            try {
                // El usuario dueño de la agenda lo determina el token de sesión del
                // lado del servidor (no un user_name que mande el cliente), así nadie
                // puede guardar la agenda de otra persona.
                const { error: errorOp } = await _supabase.rpc('guardar_agenda', {
                    p_token: obtenerTokenSesion(),
                    p_lunes: estadoDias.lunes,
                    p_martes: estadoDias.martes,
                    p_miercoles: estadoDias.miercoles,
                    p_jueves: estadoDias.jueves,
                    p_viernes: estadoDias.viernes,
                    p_sabado: estadoDias.sabado,
                    p_domingo: estadoDias.domingo,
                    p_observaciones: nota
                });

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
        { nombre: "Pollo al estilo oriental salteado al wok", descripcion: "With vegetales de estación, salsa de soja, mix de semillas, arroz frito con maní.", etiqueta: "SIN TACC" },
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

    // === STOCK: ENVÍO EN DOS ETAPAS (INICIAL / FINAL), COMBINADAS EN UNA MISMA FILA EN SHEETS ===
    const URL_GOOGLE_SHEET = "https://script.google.com/macros/s/AKfycbw8u2MFzpmLOFzHkqasuDrFuBwhB8qDQSnSYX6xKY4p9SBllkOM14_UzuLF8nB2VnXWSQ/exec";
    const CLAVE_RESPALDO_STOCK_INICIAL = "respaldoStockInicial";
    const CLAVE_RESPALDO_STOCK_FINAL = "respaldoStockFinal";
    verificarEnvioPendiente(CLAVE_RESPALDO_STOCK_INICIAL, 'respaldo-pendiente-stock-inicial', URL_GOOGLE_SHEET);
    verificarEnvioPendiente(CLAVE_RESPALDO_STOCK_FINAL, 'respaldo-pendiente-stock-final', URL_GOOGLE_SHEET);
    const COOLDOWN_INICIAL_MS = 5 * 60 * 1000; // 5 minutos
    const valoresStockManual = {};
    const estadoStockEnviosLocal = { inicialEnviado: false, timestampInicial: null };
    let intervaloCooldownInicial = null;

    // El progreso de stock se guarda en Supabase (tabla stock_progreso), asociado
    // a la cuenta -no al dispositivo- así no se pierde si cambia de celular o se
    // borra el caché a mitad de un conteo.
    async function cargarProgresoStockGuardado() {
        try {
            const { data, error } = await _supabase.rpc('obtener_stock_progreso', { p_token: obtenerTokenSesion() });
            if (error) throw error;
            const datos = (data && data.length > 0) ? data[0] : null;
            if (!datos) return;

            if (datos.valores) {
                Object.assign(valoresStockManual, datos.valores);
            }
            if (datos.barra) {
                const selectBarra = document.getElementById("select-barra");
                if (selectBarra) selectBarra.value = datos.barra;
            }
            if (datos.responsable) {
                const inputResponsable = document.getElementById("input-nombre-stock");
                if (inputResponsable) inputResponsable.value = datos.responsable;
            }
            if (typeof datos.inicial_enviado === "boolean") {
                estadoStockEnviosLocal.inicialEnviado = datos.inicial_enviado;
                estadoStockEnviosLocal.timestampInicial = datos.timestamp_inicial ? new Date(datos.timestamp_inicial).getTime() : null;
            }
        } catch (err) {
            console.error("Error al cargar el progreso de stock guardado:", err);
        }
    }

    // Debounced: el input de la tabla de stock dispara un evento por cada
    // tecla, y no tiene sentido pegarle a la red esa cantidad de veces.
    let temporizadorGuardadoStock = null;
    function guardarProgresoStockEnStorage() {
        clearTimeout(temporizadorGuardadoStock);
        temporizadorGuardadoStock = setTimeout(async () => {
            const selectBarra = document.getElementById("select-barra");
            const inputResponsable = document.getElementById("input-nombre-stock");
            try {
                await _supabase.rpc('guardar_stock_progreso', {
                    p_token: obtenerTokenSesion(),
                    p_barra: selectBarra ? selectBarra.value : "",
                    p_responsable: inputResponsable ? inputResponsable.value : "",
                    p_valores: valoresStockManual,
                    p_inicial_enviado: estadoStockEnviosLocal.inicialEnviado,
                    p_timestamp_inicial: estadoStockEnviosLocal.timestampInicial ? new Date(estadoStockEnviosLocal.timestampInicial).toISOString() : null
                });
            } catch (err) {
                console.error("Error al guardar el progreso de stock:", err);
            }
        }, 800);
    }

    // Habilita/deshabilita los botones de Inicial y Final, y muestra la cuenta
    // regresiva de 5 minutos después de mandar el Inicial (para evitar reenvíos
    // seguidos que generen líneas de más en la planilla).
    function actualizarEstadoBotonesStock() {
        const btnInicial = document.getElementById("btn-enviar-inicial");
        const btnFinal = document.getElementById("btn-enviar-final");
        const estadoTexto = document.getElementById("estado-planilla-stock");
        if (!btnInicial || !btnFinal || !estadoTexto) return;

        if (intervaloCooldownInicial) {
            clearInterval(intervaloCooldownInicial);
            intervaloCooldownInicial = null;
        }

        if (!estadoStockEnviosLocal.inicialEnviado) {
            btnInicial.disabled = false;
            btnFinal.disabled = true;
            estadoTexto.innerText = "Cargá el stock inicial y enviá primero el Inicial. El botón Final se habilita después.";
            return;
        }

        // Ya se envió el Inicial: el Final queda disponible para cuando termine el turno
        btnFinal.disabled = false;

        const actualizarCooldown = () => {
            const transcurrido = Date.now() - (estadoStockEnviosLocal.timestampInicial || 0);
            const restante = COOLDOWN_INICIAL_MS - transcurrido;

            if (restante <= 0) {
                btnInicial.disabled = false;
                estadoTexto.innerText = "Inicial ya enviado. Podés reenviarlo si te equivocaste, o cargar el Final cuando termine el turno.";
                if (intervaloCooldownInicial) {
                    clearInterval(intervaloCooldownInicial);
                    intervaloCooldownInicial = null;
                }
                return;
            }

            btnInicial.disabled = true;
            const minutos = Math.floor(restante / 60000);
            const segundos = Math.floor((restante % 60000) / 1000).toString().padStart(2, "0");
            estadoTexto.innerText = `Inicial enviado. Podés reenviarlo en ${minutos}:${segundos} si te equivocaste, o cargar el Final cuando termine el turno.`;
        };

        actualizarCooldown();
        intervaloCooldownInicial = setInterval(actualizarCooldown, 1000);
    }

    if (rolUsuario === "bartender" || rolUsuario === "barman" || rolUsuario === "administrador_barra" || rolUsuario === "admin_barra") {
        const tabComidaElement = document.getElementById("comida-tab");
        const tabBebidaElement = document.getElementById("bebida-tab");
        const tabStockLi = document.getElementById("tab-item-stock");
        const tabNotasLi = document.getElementById("tab-item-notas");

        if (tabComidaElement && tabComidaElement.parentElement) {
            tabComidaElement.parentElement.style.display = "none";
        }

        // El bloc de notas es exclusivo de los mozos
        if (tabNotasLi) {
            tabNotasLi.classList.add("d-none");
        }

        if (tabStockLi) {
            tabStockLi.classList.remove("d-none");
        }

        const tabBebidaLi = document.getElementById("tab-item-bebida");
        if (tabBebidaLi) tabBebidaLi.style.width = "50%";
        if (tabStockLi) tabStockLi.style.width = "50%";

        if (tabBebidaElement) {
            const tabBebida = new bootstrap.Tab(tabBebidaElement);
            tabBebida.show();
        }

        await cargarProgresoStockGuardado();
        renderizarStock(listaStockGlobal);
        actualizarEstadoBotonesStock();
    } else {
        renderizarComidas(listaComidasGlobal);
        await configurarBlocDeNotas(usuarioActivo);
    }

    renderizarBebidas(listaBebidasGlobal);
    configurarBuscadoresCarta();

    // === BLOC DE NOTAS PERSONAL (SOLO MOZOS) ===
    // Se guarda en Supabase (tabla notas_personal), asociado a la cuenta -no al
    // dispositivo- así no se pierde si el mozo cambia de celular o se borra el
    // caché del navegador.
    async function configurarBlocDeNotas(usuario) {
        const textarea = document.getElementById("bloc-notas-mozo");
        const badge = document.getElementById("notas-guardado-badge");
        const btnVaciar = document.getElementById("btn-vaciar-notas");
        if (!textarea) return;

        const marcarGuardado = () => {
            if (!badge) return;
            badge.innerText = "Guardado";
            badge.className = "badge bg-success bg-opacity-25 text-success border border-success small";
        };

        const marcarEscribiendo = () => {
            if (!badge) return;
            badge.innerText = "Escribiendo...";
            badge.className = "badge bg-secondary small";
        };

        // Cargar lo que tenía guardado de antes
        try {
            const { data: notaGuardada, error } = await _supabase.rpc('obtener_nota_personal', { p_token: obtenerTokenSesion() });
            if (!error && notaGuardada) {
                textarea.value = notaGuardada;
                marcarGuardado();
            }
        } catch (err) {
            console.error("Error al cargar las notas:", err);
        }

        let temporizadorGuardado = null;
        textarea.addEventListener("input", () => {
            marcarEscribiendo();
            clearTimeout(temporizadorGuardado);
            temporizadorGuardado = setTimeout(async () => {
                const { error } = await _supabase.rpc('guardar_nota_personal', { p_token: obtenerTokenSesion(), p_nota: textarea.value });
                if (!error) marcarGuardado();
            }, 600);
        });

        if (btnVaciar) {
            btnVaciar.addEventListener("click", async () => {
                if (!textarea.value.trim() || confirm("¿Vaciar todas las notas del turno?")) {
                    textarea.value = "";
                    await _supabase.rpc('guardar_nota_personal', { p_token: obtenerTokenSesion(), p_nota: "" });
                    if (badge) {
                        badge.innerText = "Sin cambios";
                        badge.className = "badge bg-secondary small";
                    }
                }
            });
        }
    }

    function renderizarComidas(comidas) {
        const contenedor = document.getElementById("contenedorComidas");
        if (!contenedor) return;
        contenedor.innerHTML = "";
        comidas.forEach(plato => {
            contenedor.innerHTML += `
                <div class="card card-custom p-3 mb-2 rounded-3" style="background-color: #16191c !important;">
                    <h6 class="fw-bold mb-1 text-light">${plato.nombre}</h6>
                    <p class="text-muted small mb-2">${plato.descripcion}</p>
                    ${plato.etiqueta ? `<div><span class="badge bg-danger bg-opacity-25 text-danger border border-danger badge-allergen">${plato.etiqueta}</span></div>` : ''}
                </div>`;
        });
    }

    function renderizarBebidas(bebidas) {
        const contenedor = document.getElementById("contenedorBebidas");
        if (!contenedor) return;
        contenedor.innerHTML = "";
        bebidas.forEach(bebida => {
            contenedor.innerHTML += `
                <div class="card card-custom p-3 mb-2 rounded-3" style="background-color: #16191c !important;">
                    <h6 class="fw-bold mb-1 text-light">${bebida.nombre}</h6>
                    <p class="text-muted small mb-2">${bebida.descripcion}</p>
                </div>`;
        });
    }

    function renderizarStock(items) {
        const contenedor = document.getElementById("tabla-stock-body");
        if (!contenedor) return;
        contenedor.innerHTML = "";
        let categoriaActual = "";
        items.forEach(item => {
            if (item.categoria !== categoriaActual) {
                categoriaActual = item.categoria;
                contenedor.innerHTML += `
                    <tr class="table-secondary text-dark fw-bold">
                        <td colspan="3" class="text-start ps-3 text-uppercase" style="background-color: #2a2f35; color: #ffc107 !important;">&mdash; ${categoriaActual} &mdash;</td>
                    </tr>`;
            }
            const guardado = valoresStockManual[item.nombre] || { inicial: "0", final: "0" };
            contenedor.innerHTML += `
                <tr data-producto="${item.nombre}">
                    <td class="text-start ps-3 text-light">${item.nombre}</td>
                    <td><input type="number" class="form-control form-control-sm bg-dark text-light border-secondary text-center input-stock-inicial" min="0" step="0.01" inputmode="decimal" value="${guardado.inicial}"></td>
                    <td><input type="number" class="form-control form-control-sm bg-dark text-light border-secondary text-center input-stock-final" min="0" step="0.01" inputmode="decimal" value="${guardado.final}"></td>
                </tr>`;
        });
    }

    // Cada vez que tipean algo (o cambian barra/responsable), lo guardamos al toque
    // en memoria Y en localStorage, para que sobreviva si recargan la página.
    const tablaStockBody = document.getElementById("tabla-stock-body");
    if (tablaStockBody) {
        tablaStockBody.addEventListener("input", (e) => {
            const input = e.target;
            const tr = input.closest("tr[data-producto]");
            if (!tr) return;
            const nombreProducto = tr.getAttribute("data-producto");
            if (!valoresStockManual[nombreProducto]) {
                valoresStockManual[nombreProducto] = { inicial: "0", final: "0" };
            }
            if (input.classList.contains("input-stock-inicial")) {
                valoresStockManual[nombreProducto].inicial = input.value;
            } else if (input.classList.contains("input-stock-final")) {
                valoresStockManual[nombreProducto].final = input.value;
            }
            guardarProgresoStockEnStorage();
        });
    }

    const selectBarraEl = document.getElementById("select-barra");
    if (selectBarraEl) selectBarraEl.addEventListener("change", guardarProgresoStockEnStorage);

    const inputResponsableEl = document.getElementById("input-nombre-stock");
    if (inputResponsableEl) inputResponsableEl.addEventListener("input", guardarProgresoStockEnStorage);

    // --- Botón "ENVIAR INICIAL": manda solo los valores iniciales a Sheets ---
    // (crea la fila en la planilla) y arranca el enfriamiento de 5 minutos.
    const btnEnviarInicial = document.getElementById("btn-enviar-inicial");
    if (btnEnviarInicial) {
        btnEnviarInicial.addEventListener("click", async () => {
            const barra = document.getElementById("select-barra").value;
            const responsable = document.getElementById("input-nombre-stock").value.trim();

            if (!barra || !responsable) {
                mostrarNotificacion("Por favor, completá la barra y el responsable.", "error");
                return;
            }

            const registrosInicial = listaStockGlobal.map(item => {
                const guardado = valoresStockManual[item.nombre] || { inicial: "0", final: "0" };
                const inicial = parseFloat(guardado.inicial) || 0;
                return {
                    semana: semanaActualStr,
                    barra: barra,
                    responsable: responsable,
                    producto: item.nombre,
                    inicial: inicial,
                    fecha_envio: new Date().toLocaleString('es-AR')
                };
            });

            btnEnviarInicial.disabled = true;
            mostrarNotificacion("Enviando Inicial a Google Sheets...", "exito");

            try {
                await enviarConRespaldo(URL_GOOGLE_SHEET, { modo: "inicial", filas: registrosInicial }, CLAVE_RESPALDO_STOCK_INICIAL);
                verificarEnvioPendiente(CLAVE_RESPALDO_STOCK_INICIAL, 'respaldo-pendiente-stock-inicial', URL_GOOGLE_SHEET);

                estadoStockEnviosLocal.inicialEnviado = true;
                estadoStockEnviosLocal.timestampInicial = Date.now();
                guardarProgresoStockEnStorage();

                mostrarNotificacion("Inicial enviado (revisá la planilla para confirmar). Ya podés cargar el Final cuando termine el turno.", "exito");
                actualizarEstadoBotonesStock();
            } catch (err) {
                mostrarNotificacion("Error al enviar el Inicial. Se guardó un respaldo para reintentar.", "error");
                verificarEnvioPendiente(CLAVE_RESPALDO_STOCK_INICIAL, 'respaldo-pendiente-stock-inicial', URL_GOOGLE_SHEET);
                btnEnviarInicial.disabled = false;
            }
        });
    }

    // --- Botón "ENVIAR FINAL": manda los valores finales (+ diferencia) a Sheets. ---
    // El Apps Script busca la fila que ya se creó con el Inicial y la completa ahí,
    // en vez de crear una fila nueva.
    const btnEnviarFinal = document.getElementById("btn-enviar-final");
    if (btnEnviarFinal) {
        btnEnviarFinal.addEventListener("click", async () => {
            const barra = document.getElementById("select-barra").value;
            const responsable = document.getElementById("input-nombre-stock").value.trim();

            if (!barra || !responsable) {
                mostrarNotificacion("Por favor, completá la barra y el responsable.", "error");
                return;
            }

            const registrosFinal = listaStockGlobal.map(item => {
                const guardado = valoresStockManual[item.nombre] || { inicial: "0", final: "0" };
                const inicial = parseFloat(guardado.inicial) || 0;
                const final = parseFloat(guardado.final) || 0;
                return {
                    semana: semanaActualStr,
                    barra: barra,
                    responsable: responsable,
                    producto: item.nombre,
                    final: final,
                    diferencia: inicial - final,
                    fecha_envio: new Date().toLocaleString('es-AR')
                };
            });

            btnEnviarFinal.disabled = true;
            mostrarNotificacion("Enviando Final a Google Sheets...", "exito");

            try {
                await enviarConRespaldo(URL_GOOGLE_SHEET, { modo: "final", filas: registrosFinal }, CLAVE_RESPALDO_STOCK_FINAL);

                mostrarNotificacion("Planilla enviada. Revisá la planilla para confirmar que se cerró.", "exito");
                await _supabase.rpc('limpiar_stock_progreso', { p_token: obtenerTokenSesion() });
                setTimeout(() => { window.location.reload(); }, 1500);
            } catch (err) {
                mostrarNotificacion("Error al enviar el Final. Se guardó un respaldo para reintentar.", "error");
                verificarEnvioPendiente(CLAVE_RESPALDO_STOCK_FINAL, 'respaldo-pendiente-stock-final', URL_GOOGLE_SHEET);
                btnEnviarFinal.disabled = false;
            }
        });
    }

    function configurarBuscadoresCarta() {
        const inputComida = document.getElementById("buscadorComida");
        if (inputComida) {
            inputComida.addEventListener("input", (e) => {
                const texto = e.target.value.toLowerCase().trim();
                renderizarComidas(listaComidasGlobal.filter(p => p.nombre.toLowerCase().includes(texto) || p.descripcion.toLowerCase().includes(texto)));
            });
        }
        const inputBebida = document.getElementById("buscadorBebida");
        if (inputBebida) {
            inputBebida.addEventListener("input", (e) => {
                const texto = e.target.value.toLowerCase().trim();
                renderizarBebidas(listaBebidasGlobal.filter(b => b.nombre.toLowerCase().includes(texto) || b.descripcion.toLowerCase().includes(texto)));
            });
        }
    }
});