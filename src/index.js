const express = require("express");
const cors = require("cors");
const path = require("path");

// CORRECCIÓN: Usamos ./ porque config está en la misma carpeta src
const { getConnection } = require("./config/db");

// Importar las rutas modularizadas
const authRoutes = require("./routes/auth.routes");
const ticketRoutes = require("./routes/ticket.routes");
const clientRoutes = require("./routes/client.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// CORRECCIÓN: Salimos de src para encontrar public
app.use(express.static(path.join(__dirname, "../public")));

// --- ENLACE DE RUTAS ---
app.get("/", (req, res) => res.redirect("/views/login.html"));
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/clientes", clientRoutes);

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () =>
    console.log(`CyclePark disponible en http://localhost:${PORT}`),
  );
  getConnection()
    .then(() => console.log("Conexión SQL Server disponible."))
    .catch((error) =>
      console.error("No se pudo conectar a SQL Server:", error.message),
    );
}
module.exports = app;
