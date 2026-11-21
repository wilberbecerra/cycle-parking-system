document.addEventListener("DOMContentLoaded", () => {
  const locked = localStorage.getItem("sesionBloqueada") === "true";
  const nombre = localStorage.getItem("usuarioNombre");
  const username = localStorage.getItem("usuarioUser");
  if (locked && nombre && username) {
    document.getElementById("login-card").style.display = "none";
    document.getElementById("unlock-card").style.display = "block";
    document.getElementById("locked-user-name").textContent = nombre;
    document.getElementById("locked-user-username").textContent = username;
    document.getElementById("unlock-password").focus();
  }
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    autenticar(
      document.getElementById("username").value.trim(),
      document.getElementById("password").value,
      false,
    );
  });
  document.getElementById("unlock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    autenticar(
      localStorage.getItem("usuarioUser"),
      document.getElementById("unlock-password").value,
      true,
    );
  });
  document.querySelectorAll("[data-password]").forEach((button) =>
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.password);
      const show = field.type === "password";
      field.type = show ? "text" : "password";
      button.textContent = show ? "Ocultar" : "Mostrar";
      button.setAttribute("aria-pressed", String(show));
    }),
  );
});
async function autenticar(username, password, locked) {
  const form = document.getElementById(locked ? "unlock-form" : "login-form");
  const error = document.getElementById(
    locked ? "unlock-error" : "login-error",
  );
  const button = form.querySelector("[type=submit]");
  const label = button.textContent;
  error.hidden = true;
  button.disabled = true;
  button.textContent = "Verificando…";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      error.textContent =
        response.status === 401
          ? "El usuario o la contraseña no son correctos."
          : "No pudimos iniciar sesión. Intenta nuevamente.";
      error.hidden = false;
      return;
    }
    const { usuario: u } = await response.json();
    localStorage.setItem("usuarioId", u.id || u.ID_USUARIO);
    localStorage.setItem("usuarioNombre", u.nombre || u.NOMBRE_EMPLEADO);
    localStorage.setItem("usuarioUser", username);
    localStorage.setItem("usuarioRol", u.rol || u.ROL);
    if (!locked) localStorage.setItem("inicioTurno", new Date().toISOString());
    localStorage.removeItem("sesionBloqueada");
    window.location.href = "dashboard.html";
  } catch {
    error.textContent =
      "No hay conexión con el servidor. Revisa la conexión e intenta nuevamente.";
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}
function cerrarSesionCompleta() {
  if (confirm("¿Generar el corte de turno antes de cambiar de usuario?"))
    window.location.href = "dashboard.html?forceCorteX=true";
}
