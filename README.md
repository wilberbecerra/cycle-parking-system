# CyclePark — Sistema de Control de Acceso e Inventario de Tickets

![Estado](https://img.shields.io/badge/Estado-Completado-1f883d?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=flat-square&logoColor=white)

**CyclePark** es una aplicación web diseñada para la gestión operativa, emisión de tickets térmicos y control de seguridad física en estacionamientos de vehículos menores. Digitaliza el flujo completo de ingreso, custodia, cierre de caja y auditoría bajo una arquitectura en 3 capas, garantizando trazabilidad en cada transacción y cumplimiento de protocolos legales de custodia.

---

## Contexto Operativo

El sistema fue concebido a partir de necesidades reales en la operación de estacionamientos de alto tránsito (referencia operativa: sede *La Rambla Brasil*), resolviendo tres cuellos de botella críticos:

*   **Ingreso de alta velocidad (Fast-Track):** Registro ágil y emisión inmediata de tickets físicos con numeración correlativa única.
*   **Control patrimonial:** Validación visual mediante captura fotográfica por cámara web para mitigar riesgos de suplantación al momento del retiro.
*   **Cumplimiento normativo:** Protocolo formal de emisión de actas ante pérdida de ticket alineado a la **Ley N° 29733** (Ley de Protección de Datos Personales).

---

## Funcionalidades Principales

*   **Motor de Impresión Térmica (80 mm):** Generación dinámica de comprobantes en PDF optimizados para impresoras POS, ajustando el alto del documento según el contenido y las cláusulas legales.
*   **Autenticación y Control de Acceso (RBAC):** Gestión diferenciada por roles (operador y administrador), protección de credenciales con **Bcrypt** y soporte de compatibilidad controlada para migración progresiva desde credenciales heredadas sin detener la operación.
*   **Continuidad de Turno:** Bloqueo de interfaz y persistencia del estado operativo para proteger la sesión del cajero ante pausas o recargas accidentales.
*   **Anulación y Auditoría:** Protocolo de anulación con verificación administrativa, captura de evidencia fotográfica para incidencias y registro de eventos.
*   **Reportes Financieros Automatizados:** Generación de cierres de caja (**Corte X / Corte Z**) en formato PDF corporativo y exportación de tablas estilizadas a Excel para auditoría.

---

## Stack Tecnológico

| Capa | Tecnologías y Librerías |
| :--- | :--- |
| **Backend** | Node.js (v18+), Express |
| **Base de Datos** | Microsoft SQL Server (Transact-SQL), driver `mssql` |
| **Frontend** | HTML5, CSS3 (Flexbox / Grid), JavaScript ES6+ (Vanilla) |
| **Arquitectura** | Patrón MVC / 3 Capas (Presentación, Lógica de Negocio/API, Datos) |
| **Seguridad** | `bcryptjs` (hashing de contraseñas), control de acceso por roles (RBAC) |
| **Reportería y Documentos** | `jspdf`, `jspdf-autotable` (PDF y tickets térmicos), `xlsx-js-style` (Excel) |

---

## Capturas del Sistema

### Seguridad y Control de Acceso

| Inicio de Sesión | Bloqueo de Turno | Gestión de Usuarios (RBAC) |
| :---: | :---: | :---: |
| ![Login](./public/assets/login.jpg) | ![Sesión Bloqueada](./public/assets/sesion-bloqueada.jpg) | ![Gestión de Usuarios](./public/assets/gesti%C3%B3n-usuarios.jpg) |
| *Validación de credenciales por rol* | *Bloqueo de interfaz con persistencia de turno* | *Módulo exclusivo de administración* |

### Operación Diaria y Emisión POS

| Panel Principal | Ticket Térmico (80 mm) | Protocolo de Anulación |
| :---: | :---: | :---: |
| ![Dashboard](./public/assets/dashboard-principal.jpg) | ![Ticket POS](./public/assets/ticket-parking.jpg) | ![Protocolo de Anulación](./public/assets/protocolo-de-anulacion.jpg) |
| *Control de ingresos y aforo en tiempo real* | *Generación dinámica en PDF con cláusulas legales* | *Flujo de validación administrativa* |

### Auditoría y Reportería

| Acta de Pérdida de Ticket | Cierre de Caja (PDF) | Exportación Financiera (Excel) |
| :---: | :---: | :---: |
| ![Acta de Pérdida](./public/assets/acta-de-perdida-de-ticket.jpg) | ![Corte X](./public/assets/corte-x.jpg) | ![Reporte Excel](./public/assets/excel.png) |
| *Captura fotográfica y acta formal (Ley N° 29733)* | *Reportes operativos Corte X / Z* | *Exportación estructurada para auditoría* |

> **Nota:** Las capturas reflejan el flujo operativo real modelado para la gestión de estacionamientos en la sede *La Rambla Brasil*.

---

## Estructura del Proyecto

```text
cycle-parking-system/
├── public/                     # Capa de Presentación (Frontend)
│   ├── assets/                 # Logos, capturas y recursos estáticos
│   ├── css/                    # Hojas de estilo responsivas
│   ├── js/                     # Lógica de cliente (Fetch API, manipulación DOM)
│   └── views/                  # Vistas HTML (Login, Dashboard y módulos)
│
├── src/                        # Capa de Lógica de Negocio y Datos (Backend)
│   ├── config/                 # Configuración y pool de conexión a SQL Server
│   ├── routes/                 # Definición de endpoints REST
│   │   ├── auth.routes.js      # Autenticación, sesiones y usuarios
│   │   ├── client.routes.js    # Registro y consulta de clientes
│   │   └── ticket.routes.js    # Ingresos, salidas, anulaciones y reportes
│   └── index.js                # Punto de entrada del servidor Express
│
├── .env                        # Variables de entorno (no versionado)
└── package.json                # Dependencias y scripts de ejecución
