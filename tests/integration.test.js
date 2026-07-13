/**
 * integration.test.js
 * --------------------
 * Cross-feature workflows: subscriber notifications, the public status
 * feed, and the admin dashboard aggregates. Admin-side calls go through
 * `api` (an authenticated client — see ./setup.js); public feed calls use
 * a plain unauthenticated request to prove those routes stay open.
 */

const request = require("supertest");
const { buildTestApp, authedClient } = require("./setup");

let app, token, api;

beforeEach(async () => {
  ({ app, token } = await buildTestApp());
  api = authedClient(app, token);
});

test("subscriber notified on incident creation", async () => {
  await api.post("/api/subscribers").send({ email: "alerts@example.com" });
  const comp = await api.post("/api/components").send({ name: "CDN" });

  await api
    .post("/api/incidents")
    .send({ title: "CDN latency spike", impact: "major", component_ids: [comp.body.id] });

  const notifications = await api.get("/api/notifications");
  expect(notifications.body.length).toBe(1);
  expect(notifications.body[0].message).toContain("CDN latency spike");
  expect(notifications.body[0].email).toBe("alerts@example.com");
});

test("subscriber notified on incident update", async () => {
  await api.post("/api/subscribers").send({ email: "ops@example.com" });
  const incident = await api.post("/api/incidents").send({ title: "API errors" });

  await api
    .post(`/api/incidents/${incident.body.id}/updates`)
    .send({ status: "monitoring", message: "Fix deployed, monitoring." });

  const notifications = await api.get("/api/notifications");
  expect(notifications.body.length).toBe(2); // creation + update
});

test("subscriber notified on maintenance scheduled", async () => {
  await api.post("/api/subscribers").send({ email: "watcher@example.com" });
  await api.post("/api/maintenance").send({
    title: "Planned downtime",
    scheduled_start: "2026-09-01 00:00:00",
    scheduled_end: "2026-09-01 01:00:00",
  });

  const notifications = await api.get("/api/notifications");
  expect(notifications.body.length).toBe(1);
  expect(notifications.body[0].message).toContain("Planned downtime");
});

test("public status reflects active incident and overall status — no login required", async () => {
  const comp = await api.post("/api/components").send({ name: "Search" });
  await api.post("/api/incidents").send({
    title: "Search is down",
    impact: "critical",
    component_ids: [comp.body.id],
    component_status: "major_outage",
  });

  const status = await request(app).get("/api/public/status");
  expect(status.body.overall_status).toBe("major_outage");
  expect(status.body.active_incidents.length).toBe(1);
  expect(status.body.components[0].status).toBe("major_outage");
});

test("public status returns operational when all clear", async () => {
  await api.post("/api/components").send({ name: "Email" });
  const status = await request(app).get("/api/public/status");
  expect(status.body.overall_status).toBe("operational");
  expect(status.body.active_incidents).toEqual([]);
});

test("resolved incident excluded from active list", async () => {
  const comp = await api.post("/api/components").send({ name: "Billing" });
  const incident = await api
    .post("/api/incidents")
    .send({ title: "Billing glitch", component_ids: [comp.body.id] });

  await api
    .post(`/api/incidents/${incident.body.id}/updates`)
    .send({ status: "resolved", message: "All clear." });

  const status = await request(app).get("/api/public/status");
  expect(status.body.active_incidents).toEqual([]);
  expect(status.body.overall_status).toBe("operational");
});

test("dashboard aggregates", async () => {
  const comp = await api.post("/api/components").send({ name: "VPN" });
  const incident = await api
    .post("/api/incidents")
    .send({ title: "VPN outage", component_ids: [comp.body.id] });

  await api
    .post(`/api/incidents/${incident.body.id}/updates`)
    .send({ status: "resolved", message: "Restored." });

  await api.post("/api/subscribers").send({ email: "lead@example.com" });

  const dashboard = await api.get("/api/dashboard");
  expect(dashboard.body.total_incidents).toBe(1);
  expect(dashboard.body.open_incidents).toBe(0);
  expect(dashboard.body.total_subscribers).toBe(1);
  expect(dashboard.body.avg_resolution_minutes).not.toBeNull();
});

test("admin routes reject requests without a token", async () => {
  const res = await request(app).get("/api/components");
  expect(res.status).toBe(401);
});

test("admin routes reject an invalid token", async () => {
  const res = await request(app).get("/api/components").set("Authorization", "Bearer not-a-real-token");
  expect(res.status).toBe(401);
});
