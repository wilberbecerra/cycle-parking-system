const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const vm = require("node:vm");
const db = require("../src/config/db");
const queries = [];
const hash = bcrypt.hashSync("test-only-password", 4);
db.getConnection = async () => ({
  request() {
    const params = {};
    return {
      input(name, type, value) {
        params[name] = arguments.length === 2 ? type : value;
        return this;
      },
      async query(text) {
        queries.push({ text, params });
        if (text.includes("FROM PRK_USUARIOS WHERE USERNAME"))
          return {
            recordset:
              params.u === "test-admin"
                ? [
                    {
                      ID_USUARIO: 7,
                      NOMBRE_EMPLEADO: "Administrador de prueba",
                      ROL: "Administrador",
                      PASSWORD_HASH: hash,
                    },
                  ]
                : [],
          };
        if (text.includes("WHERE t.ESTADO = 'Activo'"))
          return {
            recordset: [
              {
                ID_TICKET: 9,
                CODIGO_CORRELATIVO: "T-TEST",
                Cliente: "Cliente de prueba",
                DNI: "00000000",
                TIPO_VEHICULO: "Bicicleta",
                ESTADO: "Activo",
              },
            ],
          };
        if (text.includes("FROM PRK_CLIENTES WHERE DNI"))
          return { recordset: [{ NOMBRE_COMPLETO: "Cliente de prueba" }] };
        if (text.includes("SELECT ID_USUARIO, NOMBRE_EMPLEADO, USERNAME, ROL"))
          return {
            recordset: [
              {
                ID_USUARIO: 7,
                NOMBRE_EMPLEADO: "Usuario de prueba",
                USERNAME: "test-admin",
                ROL: "Administrador",
              },
            ],
          };
        return { recordset: [], rowsAffected: [1] };
      },
    };
  },
});
const app = require("../src/index");
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
test("inicio y vistas sirven los componentes locales", async () => {
  const root = await fetch(base + "/", { redirect: "manual" });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get("location"), "/views/login.html");
  for (const path of [
    "/views/login.html",
    "/views/dashboard.html",
    "/css/styles.css",
    "/js/login.js",
    "/js/dashboard.js",
    "/assets/cyclepark.svg",
    "/vendor/jspdf.umd.min.js",
    "/vendor/xlsx.bundle.js",
  ])
    assert.equal((await fetch(base + path)).status, 200, path);
});
test("autenticación válida conserva el identificador real del usuario", async () => {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "test-admin",
      password: "test-only-password",
    }),
  });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.usuario.ID_USUARIO, 7);
  assert.equal(data.usuario.ROL, "Administrador");
  assert.equal(data.usuario.PASSWORD_HASH, undefined);
});
test("autenticación rechaza una contraseña incorrecta", async () => {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: "incorrecta" }),
  });
  assert.equal(r.status, 401);
});
test("consulta de custodia devuelve vehículos activos", async () => {
  const r = await fetch(base + "/api/tickets/activos");
  assert.equal(r.status, 200);
  const rows = await r.json();
  assert.equal(rows[0].CODIGO_CORRELATIVO, "T-TEST");
  assert.equal(rows[0].ESTADO, "Activo");
});
test("identidad local funciona sin depender de una clave externa", async () => {
  const r = await fetch(base + "/api/clientes/identidad/DNI/00000000");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).nombre, "Cliente de prueba");
});
test("incidencia envía evidencia y contacto mediante parámetros SQL", async () => {
  const r = await fetch(base + "/api/tickets/perdida/9", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      foto_dni: "data:image/jpeg;base64,TEST",
      foto_rostro: "data:image/jpeg;base64,TEST2",
      telefono: "000000000",
      direccion: "Dirección de prueba",
      correo: "test@example.test",
    }),
  });
  assert.equal(r.status, 200);
  const query = queries.find((q) => q.text.includes("ESTADO = 'Perdido'"));
  assert.ok(query);
  assert.ok(!query.text.includes("..."));
  assert.match(query.text, /FOTO_DNI_BASE64\s*=\s*@fd/);
  assert.equal(query.params.tel, "000000000");
  assert.equal(query.params.fd, "data:image/jpeg;base64,TEST");
});
test("listas de usuarios no exponen hashes", async () => {
  const r = await fetch(base + "/api/auth/listar");
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data[0].PASSWORD_HASH, undefined);
  assert.equal(data[0].USERNAME, "test-admin");
});
test("campos de cliente se escapan antes de insertarse en HTML", () => {
  const context = { document: { addEventListener() {} }, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("public/js/dashboard.js", "utf8"), context);
  assert.equal(
    vm.runInContext('escapeHtml("<img src=x onerror=alert(1)>")', context),
    "&lt;img src=x onerror=alert(1)&gt;",
  );
});
