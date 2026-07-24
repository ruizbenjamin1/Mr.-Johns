// Definimos los usuarios iniciales por defecto si el sistema está vacío
const usuariosIniciales = [
    { user: "benja_admin", pass: "boca1234", rol: "super_admin" },
    { user: "bauti_barra", pass: "bauti1234", rol: "admin_barra" },
    { user: "jandina", pass: "mozo1", rol: "mozo" },
    { user: "mromano", pass: "bartender1", rol: "bartender" }
];

// Si no existen usuarios en el localStorage, los creamos con los iniciales
if (!localStorage.getItem("usuariosDB")) {
    localStorage.setItem("usuariosDB", JSON.stringify(usuariosIniciales));
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("formLogin");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById("username").value.trim();
            const passwordInput = document.getElementById("password").value;

            // Levantamos los usuarios actualizados que están guardados en localStorage
            const usuariosMock = JSON.parse(localStorage.getItem("usuariosDB"));

            const usuarioEncontrado = usuariosMock.find(
                u => u.user === usernameInput && u.pass === passwordInput
            );

            if (usuarioEncontrado) {
                // Guardamos la sesión activa en el navegador
                sessionStorage.setItem("usuarioLogueado", usuarioEncontrado.user);
                sessionStorage.setItem("rolUsuario", usuarioEncontrado.rol);

                // Redirección por roles
                switch (usuarioEncontrado.rol) {
                    case "super_admin":
                        window.location.href = "admin.html";
                        break;
                    case "admin_barra":
                        window.location.href = "jefe_barra.html";
                        break;
                    case "mozo":
                    case "bartender":
                        window.location.href = "dashboard.html";
                        break;
                    default:
                        alert("Error: Rol no reconocido.");
                }
            } else {
                alert("Usuario o contraseña incorrectos. Volvé a intentar.");
            }
        });
    }
});