/**
 * staff.test.js
 * -------------
 * Staff management is super_admin-only. Covers role enforcement, the
 * "don't delete/demote the last super_admin" safety guard, and basic CRUD.
 */

const { buildTestApp, authedClient } = require("./setup");
const request = require("supertest");

let app, token, api;

beforeEach(async () => {
  ({ app, token } = await buildTestApp());
  api = authedClient(app, token);
});

test("super admin can create a new staff member", async () => {
  const res = await api
    .post("/api/staff")
    .send({ name: "Edie Editor", email: "edie@example.com", password: "Passw0rd!", role: "editor" });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe("edie@example.com");
  expect(res.body).not.toHaveProperty("password_hash");
});

test("listing staff never exposes password_hash", async () => {
  await api.post("/api/staff").send({ name: "Vee Viewer", email: "vee@example.com", password: "Passw0rd!", role: "viewer" });
  const list = await api.get("/api/staff");
  expect(list.status).toBe(200);
  for (const member of list.body) {
    expect(member).not.toHaveProperty("password_hash");
  }
});

test("editor role cannot manage staff", async () => {
  await api.post("/api/staff").send({ name: "Edie Editor", email: "edie@example.com", password: "Passw0rd!", role: "editor" });
  const login = await request(app).post("/api/auth/login").send({ email: "edie@example.com", password: "Passw0rd!" });
  const editorApi = authedClient(app, login.body.token);

  const res = await editorApi.get("/api/staff");
  expect(res.status).toBe(403);
});

test("viewer role cannot create components", async () => {
  await api.post("/api/staff").send({ name: "Vee Viewer", email: "vee@example.com", password: "Passw0rd!", role: "viewer" });
  const login = await request(app).post("/api/auth/login").send({ email: "vee@example.com", password: "Passw0rd!" });
  const viewerApi = authedClient(app, login.body.token);

  const res = await viewerApi.post("/api/components").send({ name: "Test" });
  expect(res.status).toBe(403);

  const list = await viewerApi.get("/api/components");
  expect(list.status).toBe(200);
});

test("cannot delete the last super_admin", async () => {
  const me = await api.get("/api/auth/me");
  const res = await api.delete(`/api/staff/${me.body.staff.id}`);
  expect(res.status).toBe(409);
});

test("cannot demote the last super_admin", async () => {
  const me = await api.get("/api/auth/me");
  const res = await api.put(`/api/staff/${me.body.staff.id}`).send({ role: "editor" });
  expect(res.status).toBe(409);
});

test("can delete a super_admin when another one exists", async () => {
  const second = await api.post("/api/staff").send({ name: "Second Admin", email: "second@example.com", password: "Passw0rd!", role: "super_admin" });
  const me = await api.get("/api/auth/me");

  const res = await api.delete(`/api/staff/${me.body.staff.id}`);
  expect(res.status).toBe(200);

  // The remaining admin is still usable.
  const list = await request(app)
    .get("/api/staff")
    .set("Authorization", `Bearer ${(await request(app).post("/api/auth/login").send({ email: "second@example.com", password: "Passw0rd!" })).body.token}`);
  expect(list.status).toBe(200);
});

test("duplicate email rejected", async () => {
  await api.post("/api/staff").send({ name: "Dup", email: "dup@example.com", password: "Passw0rd!", role: "viewer" });
  const res = await api.post("/api/staff").send({ name: "Dup2", email: "dup@example.com", password: "Passw0rd!", role: "viewer" });
  expect(res.status).toBe(409);
});
