/**
 * auth.test.js
 * ------------
 * Login, token validation, and the default super_admin bootstrap account.
 */

const request = require("supertest");
const { buildTestApp } = require("./setup");
const { DEFAULT_ADMIN } = require("../backend/config");

let app;

beforeEach(async () => {
  ({ app } = await buildTestApp());
});

test("default super admin can log in", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeTruthy();
  expect(res.body.staff.role).toBe("super_admin");
  expect(res.body.staff).not.toHaveProperty("password_hash");
});

test("wrong password rejected", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: DEFAULT_ADMIN.email, password: "wrong-password" });
  expect(res.status).toBe(401);
});

test("unknown email rejected", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "nobody@example.com", password: "whatever" });
  expect(res.status).toBe(401);
});

test("login missing fields fails", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: DEFAULT_ADMIN.email });
  expect(res.status).toBe(400);
});

test("/api/auth/me returns the decoded staff payload for a valid token", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password });

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
  expect(me.status).toBe(200);
  expect(me.body.staff.email).toBe(DEFAULT_ADMIN.email);
});

test("/api/auth/me without a token is rejected", async () => {
  const res = await request(app).get("/api/auth/me");
  expect(res.status).toBe(401);
});
