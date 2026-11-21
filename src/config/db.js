require("dotenv").config({ quiet: true });
const trusted = process.env.DB_TRUSTED_CONNECTION === "true";
const sql = require(trusted ? "mssql/msnodesqlv8" : "mssql");
const dbSettings = trusted
  ? {
      connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER || "localhost"},${Number(process.env.DB_PORT || 1433)};Database=${process.env.DB_DATABASE || "DB_ParkingControl"};Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes;`,
    }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER || "localhost",
      port: Number(process.env.DB_PORT || 1433),
      database: process.env.DB_DATABASE || "DB_ParkingControl",
      options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== "false",
      },
    };
let poolPromise;
async function getConnection() {
  if (!poolPromise)
    poolPromise = new sql.ConnectionPool(dbSettings)
      .connect()
      .catch((error) => {
        poolPromise = null;
        throw error;
      });
  return poolPromise;
}
module.exports = { getConnection, sql };
