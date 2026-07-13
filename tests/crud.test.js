/**
 * crud.test.js
 * ------------
 * Unit tests covering Create/Read/Update/Delete for every entity. All
 * requests go through `api`, an authenticated client logged in as the
 * default super_admin (see ./setup.js) — components/incidents/maintenance/
 * subscribers (admin)/notifications/dashboard all require login now.
 */

const { buildTestApp, authedClient } = require("./setup");

let app, token, api;

beforeEach(async () => {
  ({ app, token } = await buildTestApp());
  api = authedClient(app, token);
});

test("create and list component", async () => {
  const create = await api.post("/api/components").send({ name: "API", group_name: "Core" });
  expect(create.status).toBe(201);

  const list = await api.get("/api/components");
  expect(list.body.length).toBe(1);
  expect(list.body[0].name).toBe("API");
  expect(list.body[0].status).toBe("operational");
});

test("create component missing name fails", async () => {
  const res = await api.post("/api/components").send({ group_name: "Core" });
  expect(res.status).toBe(400);
});

test("update component", async () => {
  const create = await api.post("/api/components").send({ name: "Database" });
  const id = create.body.id;

  const update = await api.put(`/api/components/${id}`).send({ status: "degraded" });
  expect(update.status).toBe(200);

  const get = await api.get(`/api/components/${id}`);
  expect(get.body.status).toBe("degraded");
});

test("delete component", async () => {
  const create = await api.post("/api/components").send({ name: "Cache" });
  const id = create.body.id;

  const del = await api.delete(`/api/components/${id}`);
  expect(del.status).toBe(200);

  const get = await api.get(`/api/components/${id}`);
  expect(get.status).toBe(404);
});

test("delete nonexistent component returns 404", async () => {
  const res = await api.delete("/api/components/9999");
  expect(res.status).toBe(404);
});

test("create incident links components and degrades them", async () => {
  const comp = await api.post("/api/components").send({ name: "Payments" });
  const compId = comp.body.id;

  const incident = await api
    .post("/api/incidents")
    .send({
      title: "Payments are failing",
      impact: "critical",
      message: "Investigating elevated error rates.",
      component_ids: [compId],
      component_status: "major_outage",
    });
  expect(incident.status).toBe(201);
  const incidentId = incident.body.id;

  const get = await api.get(`/api/incidents/${incidentId}`);
  expect(get.body.status).toBe("investigating");
  expect(get.body.updates.length).toBe(1);
  expect(get.body.components[0].id).toBe(compId);

  const compAfter = await api.get(`/api/components/${compId}`);
  expect(compAfter.body.status).toBe("major_outage");
});

test("incident update resolves and restores components", async () => {
  const comp = await api.post("/api/components").send({ name: "Website" });
  const compId = comp.body.id;

  const incident = await api
    .post("/api/incidents")
    .send({ title: "Site down", component_ids: [compId] });
  const incidentId = incident.body.id;

  const update = await api
    .post(`/api/incidents/${incidentId}/updates`)
    .send({ status: "resolved", message: "Fixed and verified." });
  expect(update.status).toBe(201);

  const get = await api.get(`/api/incidents/${incidentId}`);
  expect(get.body.status).toBe("resolved");
  expect(get.body.resolved_at).not.toBeNull();

  const compAfter = await api.get(`/api/components/${compId}`);
  expect(compAfter.body.status).toBe("operational");
});

test("create incident missing title fails", async () => {
  const res = await api.post("/api/incidents").send({ impact: "minor" });
  expect(res.status).toBe(400);
});

test("delete incident", async () => {
  const incident = await api.post("/api/incidents").send({ title: "Temporary blip" });
  const id = incident.body.id;

  const del = await api.delete(`/api/incidents/${id}`);
  expect(del.status).toBe(200);

  const get = await api.get(`/api/incidents/${id}`);
  expect(get.status).toBe(404);
});

test("create and list maintenance", async () => {
  const create = await api.post("/api/maintenance").send({
    title: "Database upgrade",
    scheduled_start: "2026-07-01 02:00:00",
    scheduled_end: "2026-07-01 04:00:00",
  });
  expect(create.status).toBe(201);

  const list = await api.get("/api/maintenance");
  expect(list.body.length).toBe(1);
  expect(list.body[0].title).toBe("Database upgrade");
});

test("create maintenance missing fields fails", async () => {
  const res = await api.post("/api/maintenance").send({ title: "Incomplete" });
  expect(res.status).toBe(400);
});

test("delete maintenance", async () => {
  const create = await api.post("/api/maintenance").send({
    title: "Network maintenance",
    scheduled_start: "2026-08-01 01:00:00",
    scheduled_end: "2026-08-01 02:00:00",
  });
  const id = create.body.id;

  const del = await api.delete(`/api/maintenance/${id}`);
  expect(del.status).toBe(200);

  const get = await api.get(`/api/maintenance/${id}`);
  expect(get.status).toBe(404);
});

test("subscribe and unsubscribe", async () => {
  // Subscribing is the one admin-adjacent action that stays public.
  const sub = await api.post("/api/subscribers").send({ email: "ops@example.com" });
  expect(sub.status).toBe(201);
  const id = sub.body.id;

  const list = await api.get("/api/subscribers");
  expect(list.body.length).toBe(1);

  const del = await api.delete(`/api/subscribers/${id}`);
  expect(del.status).toBe(200);

  const listAfter = await api.get("/api/subscribers");
  expect(listAfter.body.length).toBe(0);
});

test("duplicate subscriber rejected", async () => {
  await api.post("/api/subscribers").send({ email: "dup@example.com" });
  const res = await api.post("/api/subscribers").send({ email: "dup@example.com" });
  expect(res.status).toBe(409);
});

test("subscribe missing email fails", async () => {
  const res = await api.post("/api/subscribers").send({});
  expect(res.status).toBe(400);
});
