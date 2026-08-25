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

document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const inputUsuario = formLogin.querySelector("input[type='text']") || document.getElementById("username");
            const inputPassword = formLogin.querySelector("input[type='password']") || document.getElementById("password");
            const btnSubmit = formLogin.querySelector("button[type='submit']");

            if (!inputUsuario || !inputPassword) {
                mostrarNotificacion("Error en el formulario: No se encontraron los campos.", "error");
                return;
            }

            const usuarioVal = inputUsuario.value.trim().toLowerCase();
            const passVal = inputPassword.value;

            if (!usuarioVal || !passVal) {
                mostrarNotificacion("Por favor, completá todos los campos.", "error");
                return;
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Validando datos...
                `;
            }

            try {
                if (typeof _supabase === "undefined") {
                    mostrarNotificacion("Error: No se encontró la conexión a Supabase.", "error");
                    restablecerBoton(btnSubmit);
                    return;
                }

                // Verificación de login vía función de Supabase (RPC): la contraseña
                // nunca viaja como texto plano en una consulta ni se compara en el
                // cliente -la función compara el hash del lado del servidor y
                // devuelve los datos del usuario solo si coincide-.
                const { data: filasUsuario, error } = await _supabase
                    .rpc('verificar_login', { p_user_name: usuarioVal, p_pass: passVal });

                if (error) {
                    console.error("Error al consultar Supabase:", error);
                    mostrarNotificacion("Ocurrió un error al consultar la base de datos.", "error");
                    restablecerBoton(btnSubmit);
                    return;
                }

                const usuario = (filasUsuario && filasUsuario.length > 0) ? filasUsuario[0] : null;

                if (!usuario) {
                    mostrarNotificacion("Usuario o contraseña incorrectos.", "error");
                    restablecerBoton(btnSubmit);
                    return;
                }

                // Guardamos la sesión activa (el token lo valida el servidor en cada
                // operación sensible, no alcanza con lo que haya en el navegador)
                sessionStorage.setItem("usuarioLogueado", usuario.user_name);
                sessionStorage.setItem("rolUsuario", usuario.rol);
                sessionStorage.setItem("tokenSesion", usuario.token);

                mostrarNotificacion(`¡Bienvenido, ${usuario.nombre_real || usuario.user_name}!`, "exito");

                // Redirección según rol actualizada
                setTimeout(() => {
                    if (usuario.rol === "superadministrador" || usuario.rol === "admin" || usuario.rol === "super_admin") {
                        window.location.href = "admin.html";
                    } else if (usuario.rol === "administrador_barra" || usuario.rol === "barman" || usuario.rol === "admin_barra") {
                        window.location.href = "jefe_barra.html";
                    } else {
                        window.location.href = "Dashboard.html";
                    }
                }, 1000);

            } catch (err) {
                console.error("Error crítico:", err);
                mostrarNotificacion("No se pudo conectar con el servidor.", "error");
                restablecerBoton(btnSubmit);
            }
        });
    }

    function restablecerBoton(btn) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `ENTRAR`;
        }
    }
});