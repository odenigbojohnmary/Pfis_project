/**
 * setup.js
 * --------
 * Shared Jest helper: builds an app against the test database, truncates
 * every table before each test for full isolation, then re-seeds and logs
 * in as the default super_admin so tests can call the now-protected admin
 * routes. Returns an authedClient() helper so test files don't need to
 * repeat the Authorization header on every request.
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

async function buildTestApp() {
  const app = await createApp(TEST_DB_CONFIG);
  const pool = app.locals.pool;

  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of TABLES) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  // initDB() (called inside createApp, above) already seeded a default
  // super_admin, but truncating the staff table just wiped it out again —
  // re-seed it directly so every test starts with a known admin to log in as.
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

/** Returns a request client that automatically attaches the Bearer token. */
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
