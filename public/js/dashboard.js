/* --- CyclePark: Access Control & Ticket Inventory --- */
/* Presentation Layer Logic | Capa de Presentación */

/* --- VARIABLES GLOBALES --- */
let ticketsGlobal = [];
let ticketsHistorial = [];
let streamCamara = null;

/* --- INICIALIZACIÓN --- */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Validar Sesión y Saludo
    const nombre = localStorage.getItem("usuarioNombre");
    if (!nombre || nombre === "undefined") { 
        window.location.href = "login.html"; 
        return; 
    }
    document.getElementById("nombre-usuario").innerText = nombre;

    // 2. Cargar permisos de Administrador
    const rol = localStorage.getItem("usuarioRol");
    if (rol === "Administrador") {
        const btn = document.getElementById("btn-admin-usuarios");
        if (btn) btn.style.display = "inline-block";
    }

    // 3. Cargar datos iniciales
    await cargarActivos();
    initIdentidad();
});

/* --- UTILIDADES --- */
function formatearHora(isoString) {
    if (!isoString) return "--:--";
    try {
        const fecha = new Date(isoString);
        return fecha.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return isoString; }
}

function limpiarId(id) {
    if (!id) return 1;
    return id.toString().replace(':1', '').trim();
}

/* --- 1. RENDERIZADO DE TABLA (Activos) --- */
function renderTabla(lista) {
    const tbody = document.getElementById("tickets-body");
    if (!tbody) return;
    
    tbody.innerHTML = lista.map((t) => {
        const horaLimpia = formatearHora(t.HORA_INGRESO);
        const marca = t.MARCA_BICI || t.marca_bici || "-";
        const color = t.COLOR_BICI || t.color_bici || "-";
        const tipoDoc = (t.DNI && t.DNI.length > 8) ? "CE" : "DNI";

        return `
        <tr>
            <td><strong>${t.CODIGO_CORRELATIVO}</strong></td>
            <td>
                ${t.Cliente}<br>
                <small style="color:#64748b; font-weight:bold;">${tipoDoc} ${t.DNI}</small>
            </td>
            <td><span style="color:var(--primary); font-weight:bold;">${horaLimpia}</span></td>
            <td>${t.TIPO_VEHICULO || "-"}</td>
            <td>${marca} / ${color}</td>
            <td><span class="badge badge-activo">ACTIVO</span></td>
            <td style="white-space: nowrap;">
                <button onclick="abrirEditar(${t.ID_TICKET})" class="btn-action btn-edit">✏️ Editar</button>
                <button onclick="marcarSalida(${t.ID_TICKET})" class="btn-action btn-out">📤 Salida</button>
                <button onclick="abrirPerdida(${t.ID_TICKET})" class="btn-action btn-loss">🚨 Pérdida</button>
            </td>
        </tr>`;
    }).join("");
}

async function cargarActivos() {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/tickets/activos");
        if (!res.ok) throw new Error("Error en la petición activos");
        ticketsGlobal = await res.json();
        renderTabla(ticketsGlobal);
    } catch (e) { console.error("Error al cargar activos:", e); }
}

/* --- 2. ACCIONES: CREAR, EDITAR, SALIDA --- */

// A) CREAR TICKET (POST) - BLINDADO CONTRA ERRORES
async function guardarTicket() {
    const rawId = localStorage.getItem("usuarioId");
    const idUsuario = limpiarId(rawId); 
    
    // Limpiamos Inputs del formulario
    const dni = limpiarId(document.getElementById("documento-input").value);
    const nombre = document.getElementById("nombre-cliente").value.trim();

    if (!dni || !nombre) return alert("⚠️ DNI y Nombre son obligatorios.");

    const body = {
        dni_cliente: dni,
        nombre_manual: nombre,
        tipo_vehiculo: document.getElementById("tipo-vehiculo").value,
        marca: document.getElementById("marca").value.trim(),
        color: document.getElementById("color").value.trim(),
        observaciones: document.getElementById("observaciones").value.trim(),
        id_usuario_ingreso: parseInt(idUsuario) || 1
    };
    
    try {
        const res = await fetch("http://127.0.0.1:3000/api/tickets", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(body) 
        });
        
        if (res.ok) { 
            alert("✅ Ticket Registrado"); 
            location.reload(); 
        } else {
            const err = await res.text();
            alert("❌ Error del servidor: " + err);
        }
    } catch (e) { alert("❌ Error de conexión al crear ticket."); }
}

// B) EDITAR (PUT)
function abrirEditar(id) {
    const t = ticketsGlobal.find(x => x.ID_TICKET == id);
    if (!t) return;
    document.getElementById("edit-id-ticket").value = id;
    document.getElementById("edit-nombre").value = t.Cliente;
    document.getElementById("edit-marca").value = t.MARCA_BICI || "";
    document.getElementById("edit-color").value = t.COLOR_BICI || "";
    document.getElementById("edit-obs").value = t.OBSERVACIONES || "";
    document.getElementById("modal-editar").style.display = "flex";
}

async function guardarEdicion() {
    const id = document.getElementById("edit-id-ticket").value;
    const body = {
        nombre_manual: document.getElementById("edit-nombre").value,
        marca_bici: document.getElementById("edit-marca").value,
        color_bici: document.getElementById("edit-color").value,
        observaciones: document.getElementById("edit-obs").value
    };

    try {
        const res = await fetch(`http://127.0.0.1:3000/api/tickets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            alert("✅ Cambios guardados.");
            cerrarModal('modal-editar');
            await cargarActivos(); 
        }
    } catch (e) { alert("❌ Error al editar."); }
}

// C) SALIDA NORMAL
async function marcarSalida(id) {
    if (!confirm("¿Confirmar salida del vehículo?")) return;
    try {
        const res = await fetch(`http://127.0.0.1:3000/api/tickets/salida/${id}`, { method: "PUT" });
        if (res.ok) await cargarActivos();
    } catch (e) { alert("❌ Error al procesar salida."); }
}

/* --- 3. FUNCIONALIDAD DE PÉRDIDA --- */
function abrirPerdida(id) {
    const t = ticketsGlobal.find(x => x.ID_TICKET == id);
    if (!t) return;

    document.getElementById("loss-id-ticket").value = id;
    document.getElementById("loss-codigo").innerText = t.CODIGO_CORRELATIVO;
    document.getElementById("loss-cliente").innerText = t.Cliente;
    document.getElementById("loss-dni").innerText = t.DNI;
    document.getElementById("loss-ingreso").innerText = formatearHora(t.HORA_INGRESO);
    document.getElementById("loss-tipo").innerText = t.TIPO_VEHICULO;
    document.getElementById("loss-marca").innerText = t.MARCA_BICI || "-";
    document.getElementById("loss-color").innerText = t.COLOR_BICI || "-";

    document.getElementById("modal-perdida").style.display = "flex";
    iniciarCamara();
}

async function iniciarCamara() {
    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById("video-feed");
        if (video) video.srcObject = streamCamara;
    } catch (e) { alert("⚠️ Permitir cámara."); }
}

function capturarFoto(tipo) {
    const video = document.getElementById("video-feed");
    const imgId = tipo === 'anverso' ? "img-anverso" : "img-reverso";
    const img = document.getElementById(imgId);
    
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    img.src = canvas.toDataURL('image/jpeg');
    img.style.display = "block";
    if (document.getElementById("placeholder-text")) {
        document.getElementById("placeholder-text").style.display = "none";
    }
}

//Generar acta de salida
async function generarActaSalida() {
const id = document.getElementById("loss-id-ticket").value;
    const foto1 = document.getElementById("img-anverso").src;
    const foto2 = document.getElementById("img-reverso").src;
    
    // Capturar nuevos campos
    const telefono = document.getElementById("loss-telefono").value.trim();
    const direccion = document.getElementById("loss-direccion").value.trim();
    const correo = document.getElementById("loss-correo").value.trim();

    if (!foto1.startsWith('data:') || !foto2.startsWith('data:')) {
        return alert("⚠️ Es obligatorio capturar ambas fotos como evidencia.");
    }
    if (!telefono || !direccion) {
        return alert("⚠️ Teléfono y Dirección son obligatorios para el acta legal.");
    }

    try {
        const res = await fetch(`http://127.0.0.1:3000/api/tickets/perdida/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                foto_dni: foto1, 
                foto_rostro: foto2,
                telefono: telefono,
                direccion: direccion,
                correo: correo
            })
        });

        if (res.ok) {
            alert("✅ Acta registrada correctamente. Generando PDF...");
            
            // 1. Preparamos los datos para el PDF
            const datosPDF = {
                codigo: document.getElementById("loss-codigo").innerText,
                cliente: document.getElementById("loss-cliente").innerText,
                dni: document.getElementById("loss-dni").innerText,
                vehiculo: document.getElementById("loss-tipo").innerText,
                marca: document.getElementById("loss-marca").innerText,
                color: document.getElementById("loss-color").innerText,
                ingreso: document.getElementById("loss-ingreso").innerText,
                telefono, direccion, correo, foto1, foto2
            };

            // 2. Generamos el PDF
            imprimirPDFPerdida(datosPDF);

            // 3. Recargar página después de un momento
            setTimeout(() => location.reload(), 2000);
        }
    } catch (e) { alert("❌ Error al procesar pérdida."); }
}

/* --- NUEVA FUNCIÓN: DISEÑO EXACTO DEL PDF (Pegar al final de dashboard.js) --- */


/* --- 4. EXPORTACIÓN Y CORTES --- */
async function ejecutarCorte(tipo, salirAlFinal = false) {
    try {
        const resMov = await fetch('http://127.0.0.1:3000/api/clientes/hoy');
        const movimientos = await resMov.json();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`REPORTE DE MOVIMIENTOS - CORTE ${tipo}`, 105, 20, null, null, "center");
        
        doc.autoTable({ 
            startY: 30, 
            head: [['TICKET', 'CLIENTE', 'VEHÍCULO', 'INGRESO', 'SALIDA', 'ESTADO']], 
            body: movimientos.map(m => [
                m.CODIGO_CORRELATIVO, m.Cliente, m.TIPO_VEHICULO, 
                formatearHora(m.HORA_INGRESO), formatearHora(m.HORA_SALIDA), m.ESTADO
            ]) 
        });
        
        doc.save(`Corte_${tipo}_${new Date().toLocaleDateString()}.pdf`);

        if (salirAlFinal) {
            localStorage.clear();
            window.location.href = "login.html";
        }
    } catch (e) { console.error("Error en corte:", e); }
}

/* --- 5. BUSCADOR Y MODALES --- */
function filtrarTabla() {
    const texto = document.getElementById("buscador-principal").value.toLowerCase();
    const filtrados = ticketsGlobal.filter(x => 
        x.Cliente.toLowerCase().includes(texto) || 
        x.DNI.includes(texto) || 
        x.CODIGO_CORRELATIVO.toLowerCase().includes(texto)
    );
    renderTabla(filtrados);
}

function cerrarModal(id) { 
    document.getElementById(id).style.display = "none";
    if (id === 'modal-perdida' && streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
    }
}
// initIdentidad DEBE CERRARSE AQUÍ PARA NO "TRAGARSE" LAS OTRAS FUNCIONES
function initIdentidad() {
    const inputDni = document.getElementById("documento-input");
    if (!inputDni) return;

    inputDni.addEventListener("input", async (e) => {
        // Limpiamos :1 mientras escribe
        const dniLimpio = limpiarId(e.target.value);
        if (dniLimpio.length === 8) {
            try { 
                const r = await fetch(`http://127.0.0.1:3000/api/clientes/identidad/DNI/${dniLimpio}`);
                if (r.ok) { 
                    const d = await r.json(); 
                    if (d.nombre) document.getElementById("nombre-cliente").value = d.nombre; 
                } 
            } catch (e) {}
        }
    });
} // <--- ¡ESTA LLAVE ES LA QUE FALTABA O ESTABA AL FINAL DEL ARCHIVO!

/* --- 6. GESTIÓN DE USUARIOS (GLOBALES AHORA) --- */
async function abrirModalUsuarios() {
    const modal = document.getElementById("modal-usuarios");
    if(modal) {
        modal.style.display = "flex";
        await cargarListaUsuarios();
    }
}

async function cargarListaUsuarios() {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/auth/listar");
        if(res.ok) {
            const usuarios = await res.json();
            const tbody = document.getElementById("lista-usuarios-body");
            if(tbody) {
                tbody.innerHTML = usuarios.map(u => `
                    <tr style="border-bottom: 1px solid #eee">
                        <td style="padding: 8px">${u.NOMBRE_EMPLEADO}</td>
                        <td><strong>${u.USERNAME}</strong></td>
                        <td><span class="badge" style="background:#64748b; color:white;">${u.ROL}</span></td>
                        <td style="text-align: center">
                            <button onclick="eliminarUsuario(${u.ID_USUARIO}, '${u.USERNAME}')" 
                                    style="background:none; border:none; cursor:pointer;" title="Eliminar">🗑️</button>
                        </td>
                    </tr>`).join("");
            }
        }
    } catch (e) { console.error("Error al cargar usuarios"); }
}

async function crearUsuario() {
    const body = {
        nombre: document.getElementById("new-nombre").value,
        username: document.getElementById("new-user").value,
        password: document.getElementById("new-pass").value,
        rol: document.getElementById("new-rol").value,
        id_sede: 1
    };
    try {
        const res = await fetch("http://127.0.0.1:3000/api/auth/registrar", {
            method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)
        });
        if(res.ok) { alert("✅ Usuario Creado"); cargarListaUsuarios(); }
    } catch(e) { alert("❌ Error al crear usuario"); }
}

async function eliminarUsuario(id, username) {
    const actual = localStorage.getItem("usuarioNombre");
    if(username === actual) return alert("⚠️ No puedes eliminarte a ti mismo.");
    if (confirm(`¿Eliminar a ${username}?`)) {
        await fetch(`http://127.0.0.1:3000/api/auth/eliminar/${id}`, { method: "DELETE" });
        cargarListaUsuarios();
    }
}

/* --- 7. HISTORIAL Y CORTE (GLOBALES AHORA) --- */
async function abrirHistorial() {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/clientes/hoy");
        if(res.ok) {
            ticketsHistorial = await res.json();
            document.getElementById("modal-historial").style.display = "flex";
            renderHistorial(ticketsHistorial);
        }
    } catch(e) { console.error("Error historial"); }
}

function renderHistorial(lista) {
    const tbody = document.getElementById("historial-body");
    if (!tbody) return;
    tbody.innerHTML = lista.map(t => `
        <tr>
            <td><span class="badge ${t.ESTADO === 'Finalizado' ? 'badge-finalizado' : 'badge-activo'}">${t.ESTADO}</span></td>
            <td><strong>${t.CODIGO_CORRELATIVO}</strong></td>
            <td>${t.Cliente}</td>
            <td>${t.TIPO_VEHICULO || '-'}</td>
            <td>${formatearHora(t.HORA_INGRESO)}</td>
            <td>${t.HORA_SALIDA ? formatearHora(t.HORA_SALIDA) : '-'}</td>
        </tr>`).join("");
}

// Esta función recibe "X" o "Z" y pide confirmación
function cerrarSesionBoton(tipo = 'X') {
    if (confirm(`¿Desea realizar el Corte ${tipo} y cerrar sesión?`)) {
        ejecutarCorte(tipo, true);
    }
}

function imprimirPDFPerdida(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString('es-PE');

    // 1. ENCABEZADO (Barra Azul Oscura)
    doc.setFillColor(30, 41, 59); // Color oscuro
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("ACTA DE ENTREGA POR PÉRDIDA DE TICKET", 105, 12, null, null, "center");
    doc.setFontSize(10);
    doc.text(`EXPEDIENTE: ${d.codigo} | FECHA: ${fechaHoy}`, 105, 19, null, null, "center");

    // 2. SECCIÓN 1: DATOS DEL VEHÍCULO (Tabla)
    doc.setTextColor(0, 0, 0);
    doc.autoTable({
        startY: 35,
        head: [['1. DATOS DEL VEHÍCULO Y PROPIETARIO REGISTRADO']],
        body: [
            [`Ticket Original: ${d.codigo}`, `Vehículo: ${d.vehiculo}`],
            [`Propietario: ${d.cliente}`, `Marca/Color: ${d.marca} / ${d.color}`],
            [`Documento: ${d.dni}`, `Hora Ingreso: ${d.ingreso}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: 'bold' },
        styles: { fontSize: 10 }
    });

    // 3. SECCIÓN 2: DATOS DEL SOLICITANTE (Tabla)
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['2. DATOS DEL SOLICITANTE (QUIEN RETIRA)']],
        body: [
            [`Dirección Domiciliaria: ${d.direccion}`],
            [`Teléfono de Contacto: ${d.telefono}`, `Correo: ${d.correo}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: 'bold' }
    });

    // 4. SECCIÓN 3: EVIDENCIA (Fotos lado a lado)
    const yFotos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. EVIDENCIA DE IDENTIDAD Y ENTREGA", 14, yFotos);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("ROSTRO DEL SOLICITANTE", 50, yFotos + 8, null, null, "center");
    doc.text("DOCUMENTO PRESENTADO", 150, yFotos + 8, null, null, "center");

    // Insertar imágenes (Ancho, Alto) - Ajustado para que entren bien
    try {
        doc.addImage(d.foto2, 'JPEG', 15, yFotos + 12, 80, 60); // Rostro
        doc.addImage(d.foto1, 'JPEG', 115, yFotos + 12, 80, 60); // DNI
    } catch(e) { console.error("Error cargando imagenes al PDF"); }

    // 5. PIE DE PÁGINA LEGAL (Ley 29733)
    const yFooter = 260; // Parte baja de la hoja
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("DECLARACIÓN DE CONFORMIDAD Y PROTECCIÓN DE DATOS:", 14, yFooter);
    
    const textoLegal = `De conformidad con la Ley N° 29733, se deja constancia del registro de imagen y datos personales del solicitante únicamente con fines de seguridad y auditoría.\nEl solicitante declara haber recibido el vehículo en las condiciones descritas y libera al establecimiento de cualquier reclamo posterior.`;
    
    doc.setFont("helvetica", "italic");
    doc.text(textoLegal, 14, yFooter + 6, { maxWidth: 180, align: "justify" });

    // Descargar
    doc.save(`Acta_Perdida_${d.codigo}.pdf`);
}