/**
 * app.js
 * ------
 * All frontend logic for StatusWatch. Every data operation goes through
 * fetch() calls to the Flask REST API — no full page reloads, per the
 * assignment's API-driven architecture requirement.
 */

const API = "/api";

// ------------------------------------------------------------------
// Tab navigation
// ------------------------------------------------------------------
const navPublic = document.getElementById("navPublic");
const navAdmin = document.getElementById("navAdmin");
const tabPublic = document.getElementById("tabPublic");
const tabAdmin = document.getElementById("tabAdmin");

navPublic.addEventListener("click", () => switchTab("public"));
navAdmin.addEventListener("click", () => switchTab("admin"));

function switchTab(name) {
  const isPublic = name === "public";
  tabPublic.classList.toggle("active", isPublic);
  tabAdmin.classList.toggle("active", !isPublic);
  navPublic.classList.toggle("active", isPublic);
  navAdmin.classList.toggle("active", !isPublic);
  if (isPublic) loadPublicStatus();
  else loadAdminPanel();
}

// ------------------------------------------------------------------
// PUBLIC STATUS PAGE
// ------------------------------------------------------------------
const STATUS_LABELS = {
  operational: "All Systems Operational",
  degraded: "Degraded Performance",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
  maintenance: "Under Maintenance",
};

async function loadPublicStatus() {
  const res = await fetch(`${API}/public/status`);
  const data = await res.json();

  const banner = document.getElementById("overallBanner");
  const overallText = document.getElementById("overallText");
  banner.className = `overall-banner banner-${data.overall_status}`;
  banner.querySelector(".status-dot").className = `status-dot ${data.overall_status}`;
  overallText.textContent = STATUS_LABELS[data.overall_status] || data.overall_status;

  // Components grouped
  const groups = {};
  data.components.forEach((c) => {
    groups[c.group_name] = groups[c.group_name] || [];
    groups[c.group_name].push(c);
  });
  const compList = document.getElementById("componentList");
  compList.innerHTML = "";
  if (data.components.length === 0) compList.innerHTML = "<small class='muted'>No components configured yet.</small>";
  Object.entries(groups).forEach(([group, comps]) => {
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group;
    compList.appendChild(title);
    comps.forEach((c) => {
      const row = document.createElement("div");
      row.className = "component-row";
      row.innerHTML = `<span>${c.name}</span><span class="badge ${c.status}">${c.status.replace("_", " ")}</span>`;
      compList.appendChild(row);
    });
  });

  // Active incidents
  const incList = document.getElementById("activeIncidentList");
  incList.innerHTML = "";
  if (data.active_incidents.length === 0) {
    incList.innerHTML = "<small class='muted'>No active incidents.</small>";
  } else {
    data.active_incidents.forEach((inc) => {
      const div = document.createElement("div");
      div.className = `incident-card ${inc.status}`;
      div.style.marginBottom = "14px";
      const updatesHtml = inc.updates
        .map((u) => `<div class="update-line"><strong>${u.status}</strong> — ${u.message} <small class="muted">(${new Date(u.created_at).toLocaleString()})</small></div>`)
        .join("");
      div.innerHTML = `<strong>${inc.title}</strong> <span class="badge ${inc.status}">${inc.status}</span>${updatesHtml}`;
      incList.appendChild(div);
    });
  }

  // Maintenance
  const maintList = document.getElementById("maintenanceList");
  maintList.innerHTML = "";
  if (data.upcoming_maintenance.length === 0) {
    maintList.innerHTML = "<small class='muted'>Nothing scheduled.</small>";
  } else {
    data.upcoming_maintenance.forEach((m) => {
      const div = document.createElement("div");
      div.className = "update-line";
      div.innerHTML = `<strong>${m.title}</strong> — ${new Date(m.scheduled_start).toLocaleString()} to ${new Date(m.scheduled_end).toLocaleString()}`;
      maintList.appendChild(div);
    });
  }
}

document.getElementById("subscribeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("subscribeEmail").value;
  const res = await fetch(`${API}/subscribers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  const msg = document.getElementById("subscribeMsg");
  msg.textContent = res.ok ? "Subscribed! You'll be notified of incidents and maintenance." : data.error;
  if (res.ok) document.getElementById("subscribeForm").reset();
});

// ------------------------------------------------------------------
// ADMIN PANEL
// ------------------------------------------------------------------
async function loadAdminPanel() {
  await Promise.all([
    loadDashboard(),
    loadComponentsAdmin(),
    loadIncidentsAdmin(),
    loadMaintenanceAdmin(),
    loadSubscribersAdmin(),
    loadNotificationsAdmin(),
  ]);
}

async function loadDashboard() {
  const res = await fetch(`${API}/dashboard`);
  const data = await res.json();
  const el = document.getElementById("dashboardStats");
  el.innerHTML = `
    <div class="stat"><div class="value">${data.total_incidents}</div><div class="label">Total Incidents</div></div>
    <div class="stat"><div class="value">${data.open_incidents}</div><div class="label">Open Incidents</div></div>
    <div class="stat"><div class="value">${data.avg_resolution_minutes ?? "–"}</div><div class="label">Avg Resolution (min)</div></div>
    <div class="stat"><div class="value">${data.upcoming_maintenance}</div><div class="label">Upcoming Maintenance</div></div>
    <div class="stat"><div class="value">${data.total_subscribers}</div><div class="label">Subscribers</div></div>
    <div class="stat"><div class="value">${data.total_notifications_sent}</div><div class="label">Notifications Sent</div></div>
  `;
}

// --- Components ---
async function loadComponentsAdmin() {
  const res = await fetch(`${API}/components`);
  const components = await res.json();
  const tbody = document.querySelector("#componentTable tbody");
  tbody.innerHTML = "";
  components.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.group_name}</td>
      <td><span class="badge ${c.status}">${c.status.replace("_", " ")}</span></td>
      <td><button class="danger" data-id="${c.id}">Delete</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      await fetch(`${API}/components/${c.id}`, { method: "DELETE" });
      loadComponentsAdmin();
      loadIncidentComponentChecks();
    });
    tbody.appendChild(tr);
  });
  loadIncidentComponentChecks();
}

document.getElementById("componentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("compName").value;
  const group_name = document.getElementById("compGroup").value;
  const status = document.getElementById("compStatus").value;
  await fetch(`${API}/components`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, group_name, status }),
  });
  e.target.reset();
  loadComponentsAdmin();
});

async function loadIncidentComponentChecks() {
  const res = await fetch(`${API}/components`);
  const components = await res.json();
  const container = document.getElementById("incComponentChecks");
  container.innerHTML = components
    .map(
      (c) => `<label><input type="checkbox" value="${c.id}" class="inc-comp-check"> ${c.name}</label>`
    )
    .join("");
}

// --- Incidents ---
document.getElementById("createIncidentBtn").addEventListener("click", async () => {
  const title = document.getElementById("incTitle").value;
  const impact = document.getElementById("incImpact").value;
  const message = document.getElementById("incMessage").value || "We are investigating this issue.";
  const component_ids = Array.from(document.querySelectorAll(".inc-comp-check:checked")).map((el) => parseInt(el.value));

  if (!title) {
    alert("Title is required");
    return;
  }

  await fetch(`${API}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, impact, message, component_ids }),
  });

  document.getElementById("incTitle").value = "";
  document.getElementById("incMessage").value = "";
  loadIncidentsAdmin();
  loadComponentsAdmin();
  loadDashboard();
});

async function loadIncidentsAdmin() {
  const res = await fetch(`${API}/incidents`);
  const incidents = await res.json();
  const container = document.getElementById("incidentList");
  container.innerHTML = "";

  incidents.forEach((inc) => {
    const div = document.createElement("div");
    div.className = `card incident-card ${inc.status}`;
    div.innerHTML = `
      <strong>${inc.title}</strong>
      <span class="badge ${inc.status}">${inc.status}</span>
      <span class="badge" style="background:#888;">${inc.impact}</span>
      <button class="danger" style="float:right;" data-action="delete">Delete</button>
      <div class="updates-${inc.id}"></div>
      <form class="inline update-form-${inc.id}" style="margin-top:10px;">
        <select class="status-select-${inc.id}">
          <option value="investigating">Investigating</option>
          <option value="identified">Identified</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
        </select>
        <input type="text" class="msg-input-${inc.id}" placeholder="Update message" style="flex:1;">
        <button type="submit" class="primary">Post Update</button>
      </form>
    `;
    div.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      await fetch(`${API}/incidents/${inc.id}`, { method: "DELETE" });
      loadIncidentsAdmin();
      loadDashboard();
    });
    div.querySelector(`.update-form-${inc.id}`).addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = div.querySelector(`.status-select-${inc.id}`).value;
      const message = div.querySelector(`.msg-input-${inc.id}`).value;
      if (!message) return;
      await fetch(`${API}/incidents/${inc.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message }),
      });
      loadIncidentsAdmin();
      loadComponentsAdmin();
      loadDashboard();
      loadNotificationsAdmin();
    });
    container.appendChild(div);
  });
}

// --- Maintenance ---
document.getElementById("maintenanceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("maintTitle").value;
  const scheduled_start = document.getElementById("maintStart").value;
  const scheduled_end = document.getElementById("maintEnd").value;
  await fetch(`${API}/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, scheduled_start, scheduled_end }),
  });
  e.target.reset();
  loadMaintenanceAdmin();
  loadNotificationsAdmin();
});

async function loadMaintenanceAdmin() {
  const res = await fetch(`${API}/maintenance`);
  const rows = await res.json();
  const tbody = document.querySelector("#maintenanceTable tbody");
  tbody.innerHTML = "";
  rows.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.title}</td>
      <td>${new Date(m.scheduled_start).toLocaleString()}</td>
      <td>${new Date(m.scheduled_end).toLocaleString()}</td>
      <td>${m.status}</td>
      <td><button class="danger" data-id="${m.id}">Delete</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      await fetch(`${API}/maintenance/${m.id}`, { method: "DELETE" });
      loadMaintenanceAdmin();
    });
    tbody.appendChild(tr);
  });
}


// ------------------------------------------------------------------
// Initial load
// ------------------------------------------------------------------
loadPublicStatus();
