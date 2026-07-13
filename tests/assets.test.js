/**
 * assets.test.js
 * --------------
 * Company assets (servers, web apps, databases, domains) and uptime
 * tracking. Covers role gating, manual heartbeat logging, and that the
 * public uptime feed (/api/public/uptime) needs no login at all.
 */

const request = require("supertest");
const { buildTestApp, authedClient } = require("./setup");

let app, token, api;

beforeEach(async () => {
  ({ app, token } = await buildTestApp());
  api = authedClient(app, token);
});

test("editor/super_admin can create an asset", async () => {
  const res = await api.post("/api/assets").send({ name: "Primary DB", type: "database" });
  expect(res.status).toBe(201);
});

test("creating an asset without a name fails", async () => {
  const res = await api.post("/api/assets").send({ type: "server" });
  expect(res.status).toBe(400);
});

test("invalid asset type rejected", async () => {
  const res = await api.post("/api/assets").send({ name: "Mystery box", type: "spaceship" });
  expect(res.status).toBe(400);
});

test("viewer can list assets but not create them", async () => {
  await api.post("/api/staff").send({ name: "Vee Viewer", email: "vee@example.com", password: "Passw0rd!", role: "viewer" });
  const login = await request(app).post("/api/auth/login").send({ email: "vee@example.com", password: "Passw0rd!" });
  const viewerApi = authedClient(app, login.body.token);

  const create = await viewerApi.post("/api/assets").send({ name: "Sneaky server" });
  expect(create.status).toBe(403);

  const list = await viewerApi.get("/api/assets");
  expect(list.status).toBe(200);
});

test("logging a manual check updates asset status and uptime windows", async () => {
  const create = await api.post("/api/assets").send({ name: "Internal API", type: "web_app" });
  const id = create.body.id;

  const check = await api.post(`/api/assets/${id}/checks`).send({ status: "down", response_time_ms: 0 });
  expect(check.status).toBe(201);

  const get = await api.get(`/api/assets/${id}`);
  expect(get.body.status).toBe("down");
  expect(get.body.uptime_24h).toBe(0);

  const history = await api.get(`/api/assets/${id}/checks`);
  expect(history.body.length).toBe(1);
  expect(history.body[0].source).toBe("manual");
});

test("invalid check status rejected", async () => {
  const create = await api.post("/api/assets").send({ name: "Queue", type: "server" });
  const res = await api.post(`/api/assets/${create.body.id}/checks`).send({ status: "sideways" });
  expect(res.status).toBe(400);
});

test("uptime recovers to 100% after an up check", async () => {
  const create = await api.post("/api/assets").send({ name: "Edge node", type: "server" });
  const id = create.body.id;

  await api.post(`/api/assets/${id}/checks`).send({ status: "up" });
  const get = await api.get(`/api/assets/${id}`);
  expect(get.body.status).toBe("up");
  expect(get.body.uptime_24h).toBe(100);
});

test("deleting an asset requires editor/super_admin", async () => {
  const create = await api.post("/api/assets").send({ name: "Old server" });
  const del = await api.delete(`/api/assets/${create.body.id}`);
  expect(del.status).toBe(200);
});

test("assets require login — no token is rejected", async () => {
  const res = await request(app).get("/api/assets");
  expect(res.status).toBe(401);
});

test("public uptime feed requires no login and hides ping_url", async () => {
  const create = await api.post("/api/assets").send({ name: "Public-facing app", type: "web_app", ping_url: "https://example.com/health" });
  await api.post(`/api/assets/${create.body.id}/checks`).send({ status: "up" });

  const res = await request(app).get("/api/public/uptime");
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(1);
  expect(res.body[0].name).toBe("Public-facing app");
  expect(res.body[0].uptime_24h).toBe(100);
  expect(res.body[0]).not.toHaveProperty("ping_url");
});
