/**
 * setup.js
 * --------
 * Shared Jest helper. Key design decision: createApp() (and therefore
 * initDB()) is called ONCE per process and cached — not once per test.
 * Calling initDB() before every test was opening a fresh MySQL connection
 * 48 times and exhausting the server's max_connections limit.
 *
 * What still happens before every test (inside buildTestApp):
 *   - All tables are truncated (full isolation)
 *   - The default super_admin is re-seeded (wiped by the truncation)
 *   - A fresh login is performed to get a valid JWT for that test
 */

const request = require("supertest");
const { createApp } = require("../backend/server");
const { TEST_DB_CONFIG, DEFAULT_ADMIN } = require("../backend/config");
const { hashPassword } = require("../backend/auth");

const TABLES = [
  "uptime_checks",
  "assets",
  "notifications",
  "incident_updates",
  "incident_components",
  "maintenance_components",
  "incidents",
  "maintenance",
  "components",
  "subscribers",
  "staff",
];

// Cache the app + pool so initDB only runs once for the entire test run.
let _app = null;

async function getApp() {
  if (!_app) {
    _app = await createApp(TEST_DB_CONFIG);
  }
  return _app;
}

async function buildTestApp() {
  const app = await getApp();
  const pool = app.locals.pool;

  // Wipe all data for a clean slate, then re-seed the admin account.
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of TABLES) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  const password_hash = await hashPassword(DEFAULT_ADMIN.password);
  await pool.query(
    "INSERT INTO staff (name, email, password_hash, role) VALUES (?, ?, ?, 'super_admin')",
    [DEFAULT_ADMIN.name, DEFAULT_ADMIN.email, password_hash]
  );

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password });

  return { app, token: login.body.token };
}

/** Returns a supertest client that automatically attaches the Bearer token. */
function authedClient(app, token) {
  const agent = request(app);
  const withAuth = (req) => (token ? req.set("Authorization", `Bearer ${token}`) : req);
  return {
    get: (url) => withAuth(agent.get(url)),
    post: (url) => withAuth(agent.post(url)),
    put: (url) => withAuth(agent.put(url)),
    delete: (url) => withAuth(agent.delete(url)),
  };
}

module.exports = { buildTestApp, authedClient };
