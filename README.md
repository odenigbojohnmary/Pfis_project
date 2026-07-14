# JmZOps APP

**Student Name: Nzubechukwu Johnmary Odenigbo**
**Student Number: 20083494**
**Module: B9IS123 - Programming for Information Systems**  
**Lecturer: Paul Laird**
**Submission Date: July 14, 2026**

---

## Overview

JmZOps lets a company publish the live operational status of its services to the public, while giving the team an admin panel to manage components, declare incidents, post timestamped updates, schedule maintenance windows, and manage email subscribers.

It mirrors the core feature set of commercial status-page products such as **status.io**, **Atlassian Statuspage**, and **Better Uptime**: a public status page, an incident timeline, scheduled maintenance, and subscriber notifications.

This is the JavaScript/Express project and the frontend communicate through fetch() calls.
---

## Why This Project

Status pages are used everywhere in most SaaS industry — every major cloud provider, API, and SaaS tool has their own status page dashboard (eg: Amazon, GitHub, Stripe,Cloudflare, etc.). They are an example of a CRUD-heavy and API-driven information system: incidents and components are created/read/updated/deleted constantly, and the public-facing view must be perfectly in sync with the admin actions at the backend.

---

### Data Requirements

| Entity            | Description                                                          |
|--------------------|------------------------------------------------------------------------|
| Components         | The services shown on the status page (e.g. API, Website, Database)   |
| Incidents          | Outages/degradations affecting one or more components                |
| Incident Updates   | Timestamped timeline entries on an incident (investigating → resolved)|
| Maintenance        | Scheduled maintenance windows affecting one or more components        |
| Subscribers        | Email addresses subscribed to status notifications                    |
| Notifications       | Log of every simulated notification sent to subscribers              |

---

## Tech Stack

| Layer              | Technology                          | Purpose                              |
|--------------------|--------------------------------------|---------------------------------------|
| Backend runtime    | Node.js v20+                         | JavaScript server-side runtime        |
| Web framework      | Express.js v4                        | REST API routing                      |
| Database           | MySQL 8+                             | Relational data storage               |
| DB library         | mysql/promise                        | MySQL driver with connection pooling  |
| Environment config | dotenv                               | Load credentials from `.env` file     |
| CORS               | cors                                 | Allow frontend to call the API        |
| Frontend           | Vanilla HTML5 + JavaScript           | No framework — `fetch()` API calls    |

---

## Architecture

```
Browser (public status page + admin panel — same SPA, two tabs)
      |
      |  fetch() — JSON over HTTP, no page reloads
      v
Express REST API  (Node.js — port 5050)
      |
      |--- /api/public/status   ──┐
      |--- /api/components        |
      |--- /api/incidents         ├──  MySQL Database (jmzops_db)
      |--- /api/maintenance       |     tables: components, incidents,
      |--- /api/subscribers       |     incident_updates, incident_components,
      |--- /api/notifications     |     maintenance, maintenance_components,
      |--- /api/dashboard       ──┘     subscribers, notifications
```


The frontend never queries MySQL directly — every read and write goes through the REST API, satisfying the assignment's API-driven architecture requirement.

---

## Database Schema

### components
| Column        | Type                                                                          | Notes              |
|----------------|--------------------------------------------------------------------------------|---------------------|
| id             | INT AUTO_INCREMENT PK                                                          |                    |
| name           | VARCHAR(120)                                                                    | Required           |
| description    | VARCHAR(255)                                                                    |                    |
| group_name     | VARCHAR(120)                                                                    | Default: General   |
| status         | ENUM('operational','degraded','partial_outage','major_outage','maintenance')   | Default: operational|
| display_order  | INT                                                                             | Default: 0          |
| created_at     | DATETIME                                                                        | Auto-set            |

### incidents
| Column      | Type                                                            | Notes              |
|-------------|-------------------------------------------------------------------|---------------------|
| id          | INT AUTO_INCREMENT PK                                            |                    |
| title       | VARCHAR(255)                                                      | Required            |
| impact      | ENUM('minor','major','critical')                                 | Default: minor       |
| status      | ENUM('investigating','identified','monitoring','resolved')       | Default: investigating |
| created_at  | DATETIME                                                          | Auto-set             |
| resolved_at | DATETIME                                                          | Set when status=resolved |

### incident_updates
| Column      | Type                  | Notes                          |
|-------------|------------------------|---------------------------------|
| id          | INT AUTO_INCREMENT PK |                                 |
| incident_id | INT FK → incidents(id) | ON DELETE CASCADE               |
| status      | ENUM (same as incidents.status) |                        |
| message     | TEXT                  | Required                        |
| created_at  | DATETIME              | Auto-set                        |

### incident_components (junction table)
| Column        | Type                    | Notes                |
|----------------|--------------------------|------------------------|
| incident_id    | INT FK → incidents(id)  | ON DELETE CASCADE, composite PK |
| component_id   | INT FK → components(id) | ON DELETE CASCADE, composite PK |

### maintenance
| Column           | Type                                                       | Notes               |
|-------------------|--------------------------------------------------------------|-----------------------|
| id                | INT AUTO_INCREMENT PK                                        |                      |
| title             | VARCHAR(255)                                                  | Required             |
| description       | TEXT                                                          |                      |
| scheduled_start   | DATETIME                                                      | Required              |
| scheduled_end     | DATETIME                                                      | Required              |
| status            | ENUM('scheduled','in_progress','completed','cancelled')       | Default: scheduled   |
| created_at        | DATETIME                                                      | Auto-set              |

### maintenance_components (junction table)
| Column         | Type                       | Notes                         |
|------------------|-----------------------------|---------------------------------|
| maintenance_id   | INT FK → maintenance(id)   | ON DELETE CASCADE, composite PK |
| component_id     | INT FK → components(id)    | ON DELETE CASCADE, composite PK |

### subscribers
| Column     | Type                 | Notes               |
|------------|------------------------|-----------------------|
| id         | INT AUTO_INCREMENT PK |                       |
| email      | VARCHAR(180) UNIQUE    | Required              |
| created_at | DATETIME               | Auto-set              |

### notifications
| Column          | Type                       | Notes                          |
|------------------|------------------------------|----------------------------------|
| id               | INT AUTO_INCREMENT PK       |                                 |
| subscriber_id    | INT FK → subscribers(id)    | ON DELETE CASCADE                |
| incident_id      | INT FK → incidents(id)      | Nullable, ON DELETE CASCADE      |
| maintenance_id   | INT FK → maintenance(id)    | Nullable, ON DELETE CASCADE      |
| message          | TEXT                        | Required                        |
| sent_at          | DATETIME                    | Auto-set                        |

---

## Project Structure

```
JmZOps/
├── backend/
│   ├── server.js              # createApp() factory — registers routes, serves frontend
│   ├── db.js                  # MySQL connection pools (keyed by DB name) + schema init
│   ├── config.js              # DB credentials loaded from environment variables
│   ├── notify.js              # Simulated subscriber notification helper
│   └── routes/
│       ├── components.js      # Component CRUD
│       ├── incidents.js       # Incident CRUD + nested incident-updates timeline
│       ├── maintenance.js     # Maintenance window CRUD
│       ├── subscribers.js     # Subscribe/unsubscribe
│       ├── notifications.js   # Notification log (admin)
│       ├── public.js          # Public status feed
│       └── dashboard.js       # Admin aggregate statistics
├── frontend/
│   ├── index.html             # Single-page UI — public status page + admin panel tabs
│   └── app.js                 # All fetch() calls and DOM rendering (shared with Python version)
├── tests/
│   ├── setup.js               # Jest helper — builds app against test DB + truncates tables
│   ├── crud.test.js           # Unit tests — CRUD across all entities
│   └── integration.test.js    # Integration tests — notifications + public feed + dashboard
├── package.json
├── .env.example
├── .gitignore
└── README.md


---

## Setup & Installation

### Prerequisites
- Node.js v18 or higher
- MySQL 8 running locally (or a remote instance)
- npm

### Step 1 — Navigate to the folder
```bash
cd JmzOps-js
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Configure environment variables
```bash
cp .env.example .env
```
Fill in your MySQL credentials in `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=JmzOps_db
DB_TEST=JmzOps_test_db
PORT=5050
JWT_SECRET=dev-secret-change-me-in-production
ADMIN_NAME=Default Admin
ADMIN_EMAIL=
ADMIN_PASSWORD=
MONITOR_INTERVAL_MS=6000
```

On first run, since the `staff` table is empty, the app automatically creates the super_admin account above — **log in with it, then change the password** via the Staff section of the admin panel (or by re-issuing your own staff record). There's no self-service registration: every other staff account has to be created by a super_admin.

---

## Running the Application

```bash
# Production mode
npm start

# Development mode (auto-restarts on file changes — requires nodemon)
npm run dev
```

On first run, the server **automatically creates** the `jmzops_db` database and all eleven tables, and seeds the default super_admin (see above) if `staff` is empty. It also starts the background asset monitor.

Open your browser at: **http://localhost:5050**

---

## Authentication & Roles

Staff login is JWT-based: `POST /api/auth/login` returns a token, which the frontend sends as `Authorization: Bearer <token>` on every admin request. There's no public registration — accounts are created by a super_admin.

| Role          | Can view components/incidents/maintenance/assets | Can create/edit/delete them | Can manage staff |
|---------------|----------------------------------------------------|-------------------------------|---------------------|
| `viewer`      | Yes                                                 | No                            | No                   |
| `editor`      | Yes                                                 | Yes                           | No                   |
| `super_admin` | Yes                                                 | Yes                           | Yes                  |

The **public status page and the public uptime feed never require login** — `GET /api/public/status` and `GET /api/public/uptime` are open to anyone, by design. Subscribing to email updates (`POST /api/subscribers`) also stays public, since it's a visitor-facing form. Everything else under `/api/*` requires a valid staff token, and write operations additionally require `editor` or `super_admin`.

A safety guard in `routes/staff.js` blocks deleting or demoting the last remaining `super_admin`, so the admin panel can never be locked out entirely.


### Public (no login, ever)
| Method | Endpoint            | Description                                                          |
|--------|------------------------|--------------------------------------------------------------------------|
| GET    | /api/public/status   | Overall status + components + active incidents + upcoming maintenance |
| GET    | /api/public/uptime    | Asset list with computed 24h/7d/30d/90d uptime % (no ping_url exposed) |

### Auth
| Method | Endpoint        | Description                                  |
|--------|--------------------|--------------------------------------------------|
| POST   | /api/auth/login   | Log in with email + password, returns a JWT       |
| GET    | /api/auth/me       | Validate the current token, returns the staff payload |

### Staff (super_admin only)
| Method | Endpoint           | Description                            |
|--------|----------------------|---------------------------------------------|
| GET    | /api/staff          | List staff accounts                         |
| POST   | /api/staff          | Create a staff account with a role           |
| PUT    | /api/staff/:id       | Update name/email/password/role              |
| DELETE | /api/staff/:id       | Delete a staff account                       |

### Assets (login required; write needs editor/super_admin)
| Method | Endpoint                   | Description                                    |
|--------|--------------------------------|------------------------------------------------------|
| GET    | /api/assets                   | List assets with computed uptime windows               |
| POST   | /api/assets                   | Create an asset (optionally with a ping_url)            |
| GET    | /api/assets/:id                | Get one asset with computed uptime windows              |
| PUT    | /api/assets/:id                | Update an asset                                          |
| DELETE | /api/assets/:id                | Delete an asset (cascades its uptime_checks)             |
| POST   | /api/assets/:id/checks          | Log a manual up/down heartbeat                           |
| GET    | /api/assets/:id/checks          | View the last 100 checks (auto + manual)                 |

### Components
| Method | Endpoint              | Description          |
|--------|--------------------------|------------------------|
| GET    | /api/components         | List all components   |
| POST   | /api/components         | Create a component     |
| GET    | /api/components/:id     | Get one component      |
| PUT    | /api/components/:id     | Update a component     |
| DELETE | /api/components/:id     | Delete a component     |

### Incidents
| Method | Endpoint                       | Description                                              |
|--------|-----------------------------------|----------------------------------------------------------------|
| GET    | /api/incidents (?status=)       | List incidents, optional status filter                          |
| POST   | /api/incidents                  | Create an incident (links components, notifies subscribers)     |
| GET    | /api/incidents/:id              | Get one incident with its full update timeline                   |
| PUT    | /api/incidents/:id              | Update incident fields (auto-sets resolved_at on resolve)        |
| DELETE | /api/incidents/:id              | Delete an incident                                                |
| POST   | /api/incidents/:id/updates      | Post a new timeline update                                       |

### Maintenance
| Method | Endpoint              | Description                                       |
|--------|--------------------------|--------------------------------------------------------|
| GET    | /api/maintenance        | List maintenance windows                                |
| POST   | /api/maintenance        | Schedule maintenance                                    |
| GET    | /api/maintenance/:id    | Get one maintenance window                              |
| PUT    | /api/maintenance/:id    | Update a maintenance window                             |
| DELETE | /api/maintenance/:id    | Delete a maintenance window                             |

### Subscribers & Notifications
| Method | Endpoint                | Description                                |
|--------|----------------------------|-----------------------------------------------|
| GET    | /api/subscribers          | List subscribers (admin)                      |
| POST   | /api/subscribers          | Subscribe an email (public)                   |
| DELETE | /api/subscribers/:id      | Unsubscribe                                    |
| GET    | /api/notifications         | View the simulated notification log (admin)  |

### Dashboard
| Method | Endpoint       | Description                                          |
|--------|------------------|-----------------------------------------------------------|
| GET    | /api/dashboard  | Aggregate stats: incidents, resolution time, subscribers |

---

## Features

Full CRUD across all entities, incident timelines, component auto-sync (degrade on incident, auto-restore on resolve), real subscriber email notifications sent via SMTP (and logged to the database), the public status feed with computed overall status, and an admin dashboard — plus, new in this version: JWT staff login with super_admin/editor/viewer roles, staff account management, a separate "assets" entity for internal infrastructure (servers, web apps, databases, domains), and uptime tracking via both automatic background HTTP pings and manual heartbeat logging, with rolling 24h/7d/30d/90d uptime percentages shown on both the admin panel and the public status page.

---

### Admin Dashboard
Live aggregate stats: component health breakdown, total/open incidents, average resolution time (via `TIMESTAMPDIFF`), upcoming maintenance count, subscriber count, and total notifications sent.

---

## Running Tests

```bash
npm test
```

Tests use a separate `JmzOps_test_db` database. All tables are truncated before each test via `tests/setup.js` for full isolation.

### Test coverage
- `tests/crud.test.js` — unit tests covering CRUD across components, incidents, maintenance, and subscribers (as an authenticated staff member), including validation and 404/409 edge cases
- `tests/integration.test.js` — integration tests covering subscriber notifications, the public status feed (asserted with no auth header), dashboard aggregation, and rejecting requests with no/invalid tokens
- `tests/auth.test.js` — login success/failure, token validation via `/me`
- `tests/staff.test.js` — role enforcement (editor/viewer blocked from staff and write routes) and the last-super-admin delete/demote guard
- `tests/assets.test.js` — asset CRUD, role gating, manual check logging, uptime % computation, and the public uptime feed requiring no login and hiding `ping_url`

---

## Comparable Products

| Product                  | Description                                                  |
|----------------------------|------------------------------------------------------------------|
| status.io                 | Hosted status pages and incident communication for SaaS companies |
| Atlassian Statuspage       | Market-leading hosted status page product                        |
| Better Uptime / Better Stack | Combined uptime monitoring + status pages                       |
| Instatus                  | Lightweight, fast status page tool                                |

JmzOps reimplements the core feature set of these products (public status page, incident timeline, scheduled maintenance, subscriber notifications) as a self-contained academic CRUD/API exercise.

---

## npm Libraries & Frameworks

| Package         | Version  | Purpose                                        | Licence    | URL                                          |
|-----------------|----------|--------------------------------------------------|------------|-------------------------------------------------|
| express         | ^4.19.2  | Web framework — REST API routing and middleware   | MIT        | https://expressjs.com                            |
| mysql2          | ^3.10.0  | MySQL driver with Promise/async-await support    | MIT        | https://github.com/sidorares/node-mysql2         |
| cors            | ^2.8.5   | Cross-Origin Resource Sharing middleware          | MIT        | https://github.com/expressjs/cors                |
| dotenv          | ^16.4.5  | Loads environment variables from `.env` file      | BSD-2      | https://github.com/motdotla/dotenv               |
| nodemailer      | ^6.9.14  | Sends subscriber notification emails over SMTP    | MIT        | https://nodemailer.com                           |
| jsonwebtoken    | ^9.0.2   | Signs/verifies JWTs for staff login sessions      | MIT        | https://github.com/auth0/node-jsonwebtoken       |
| bcryptjs        | ^2.4.3   | Hashes staff passwords before storing them        | MIT        | https://github.com/dcodeIO/bcrypt.js              |
| jest            | ^29.7.0  | JavaScript testing framework                       | MIT        | https://jestjs.io                                  |
| supertest       | ^7.0.0   | HTTP assertions for testing Express routes         | MIT        | https://github.com/ladjs/supertest                |

Node.js built-in modules used (no external install required):
- `path` — file path resolution for serving static frontend files

---

## Learning Resources & Documentation Referenced

| Resource                                  | URL                                                                 | Used For                              |
|-------------------------------------------|-----------------------------------------------------------------------|------------------------------------------|
| Express.js Official Documentation         | https://expressjs.com/en/4x/api.html                                | Routing, middleware, static files        |
| mysql2 README                             | https://github.com/sidorares/node-mysql2#readme                     | Connection pool, prepared statements     |
| MDN Web Docs — Fetch API                  | https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API           | Frontend API calls                        |
| MDN Web Docs — async/await                | https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises | Async patterns               |
| Jest Documentation                        | https://jestjs.io/docs/getting-started                                | Test structure, mocking                   |
| Supertest GitHub README                   | https://github.com/ladjs/supertest#readme                            | HTTP integration testing                  |
| Node.js dotenv Documentation              | https://github.com/motdotla/dotenv#readme                            | Loading .env credentials                  |
| MySQL 8 Reference Manual                  | https://dev.mysql.com/doc/refman/8.0/en/                             | SQL syntax, ENUM types, FK constraints    |
| Atlassian Statuspage public documentation | https://www.atlassian.com/software/statuspage                        | Reference for status-page feature set     |
| status.io public product pages           | https://www.status.io                                                  | Reference for the product category this project is modelled on |

---

## Generative AI Assistance

Portions of this project were developed with assistance from **Claude** (Anthropic).

Specifically, Claude assisted with:
- System architecture design — modelling the status.io/Statuspage feature set (components, incidents, incident timeline, maintenance, subscriber notifications) as a relational schema
- Implementation of the authentication part of the application.
- Resolving the issues faced in some of the applicatication fixture.
- Writing some test cases.
- Drafting the README.md 