let cortePendiente = "X";
function avisar(message, type = "success") {
  if (
    type === "success" &&
    /error|incorrect|obligator|rechaz|no se pudo|debe especificar/i.test(
      message,
    )
  )
    type = "error";
  const region = document.getElementById("toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = message;
  region.append(toast);
  setTimeout(() => toast.remove(), 6000);
}
async function actualizarIndicadores() {
  document.getElementById("stat-active").textContent = ticketsGlobal.length;
  document.getElementById("active-count").textContent = ticketsGlobal.length;
  document.getElementById("stat-bikes").textContent = ticketsGlobal.filter(
    (t) => /bici/i.test(t.TIPO_VEHICULO || ""),
  ).length;
  document.getElementById("stat-scooters").textContent = ticketsGlobal.filter(
    (t) => /scooter/i.test(t.TIPO_VEHICULO || ""),
  ).length;
  try {
    const r = await fetch("/api/clientes/hoy");
    if (!r.ok) throw new Error();
    const rows = await r.json();
    document.getElementById("stat-today").textContent = rows.length;
  } catch {
    document.getElementById("stat-today").textContent = "—";
  }
}
function solicitarCorte(tipo) {
  cortePendiente = tipo;
  document.getElementById("report-title").textContent =
    tipo === "X" ? "Corte parcial X" : "Cierre de jornada Z";
  document.getElementById("report-description").textContent =
    tipo === "X"
      ? "Genera los documentos de tu turno actual."
      : "Consolida la operación del día, incluidos los turnos anteriores.";
  document.getElementById("report-user").textContent =
    localStorage.getItem("usuarioNombre") || "Operador";
  document.getElementById("report-active").textContent = ticketsGlobal.length;
  document.getElementById("modal-corte").style.display = "flex";
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-date").textContent =
    new Date().toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  document.getElementById("user-role").textContent =
    localStorage.getItem("usuarioRol") || "Personal autorizado";
  const start = localStorage.getItem("inicioTurno");
  document.getElementById("shift-start").textContent = start
    ? new Date(start).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  let returnFocus;
  const visible = (modal) => modal.style.display === "flex";
  document.querySelectorAll(".modal").forEach((modal) => {
    new MutationObserver(() => {
      if (visible(modal)) {
        returnFocus = document.activeElement;
        const input = modal.querySelector(
          "input:not([type=hidden]):not([readonly]),textarea:not([readonly]),button",
        );
        input?.focus();
      } else if (returnFocus?.isConnected) returnFocus.focus();
    }).observe(modal, { attributes: true, attributeFilter: ["style"] });
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        cerrarModal(modal.id);
        return;
      }
      if (e.key !== "Tab") return;
      const fields = [
        ...modal.querySelectorAll(
          "button,input:not([type=hidden]),select,textarea,a[href]",
        ),
      ].filter((el) => !el.disabled && el.getClientRects().length);
      if (!fields.length) return;
      const first = fields[0],
        last = fields.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  });
});
