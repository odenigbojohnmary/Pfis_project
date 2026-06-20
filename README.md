# StatusWatch — JavaScript Version

**A public status-page / incident-communication system, in the style of status.io and Atlassian Statuspage.**
Built with Node.js, Express.js, MySQL, and Vanilla JavaScript.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Project Structure](#project-structure)
6. [Setup & Installation](#setup--installation)
7. [Running the Application](#running-the-application)
8. [API Endpoints](#api-endpoints)
9. [Features](#features)
10. [Running Tests](#running-tests)
11. [Key Differences from Python Version](#key-differences-from-python-version)
12. [Attributions](#attributions)

---

## Overview

This is the JavaScript/Express port of the StatusWatch project — a public status-page system modelled on status.io and Atlassian Statuspage. It exposes the exact same REST API contract and reuses the identical frontend as the Python/Flask version in `../statuswatch`, so both implementations are drop-in equivalents of one another.

A public status page shows live component health, active incidents (with a timestamped update timeline), and upcoming maintenance. An admin panel manages components, incidents, maintenance windows, and email subscribers. Every incident/maintenance event triggers a simulated subscriber notification, logged for review in the admin panel.

The frontend communicates exclusively through `fetch()` calls — no page refreshes (as required by the assignment brief).

---

## Tech Stack

| Layer              | Technology                          | Purpose                              |
|--------------------|---------------------------------------|-----------------------------------------|
| Backend runtime    | Node.js v18+                          | JavaScript server-side runtime         |
| Web framework      | Express.js v4                         | REST API routing and middleware        |
| Database           | MySQL 8                               | Relational data storage                 |
| DB library         | mysql2/promise                        | MySQL driver with async/await support  |
| Environment config | dotenv                                | Load credentials from `.env` file       |
| CORS               | cors                                   | Allow frontend to call the API          |
| Frontend           | Vanilla HTML5 + JavaScript            | No framework — `fetch()` API calls      |
| Testing framework  | Jest                                  | Unit and integration tests              |
| HTTP test client   | Supertest                             | Test Express routes without a browser   |

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
      |--- /api/incidents         ├──  MySQL Database (statuswatch_db)
      |--- /api/maintenance       |     tables: components, incidents,
      |--- /api/subscribers       |     incident_updates, incident_components,
      |--- /api/notifications     |     maintenance, maintenance_components,
      |--- /api/dashboard       ──┘     subscribers, notifications
```

---

## Database Schema

Identical to the Python version — see `../statuswatch/README.md#database-schema` for the full column-level breakdown of: `components`, `incidents`, `incident_updates`, `incident_components`, `maintenance`, `maintenance_components`, `subscribers`, and `notifications`.

---

## Project Structure

```
statuswatch-js/
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
```

---

## Setup & Installation

### Prerequisites
- Node.js v18 or higher
- MySQL 8 running locally (or a remote instance)
- npm

### Step 1 — Navigate to the folder
```bash
cd statuswatch-js
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
DB_NAME=statuswatch_db
DB_TEST=statuswatch_test_db
PORT=5050
```

---

## Running the Application

```bash
# Production mode
npm start

# Development mode (auto-restarts on file changes — requires nodemon)
npm run dev
```

On first run, the server **automatically creates** the `statuswatch_db` database and all eight tables.

Open your browser at: **http://localhost:5050**

---

## API Endpoints

Identical contract to the Python version:

### Public
| Method | Endpoint            | Description                                                          |
|--------|------------------------|--------------------------------------------------------------------------|
| GET    | /api/public/status   | Overall status + components + active incidents + upcoming maintenance |

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

Same feature set as the Python version: full CRUD across all entities, incident timelines, component auto-sync (degrade on incident, auto-restore on resolve), simulated subscriber notifications logged to the database, the public status feed with computed overall status, and an admin dashboard.

---

## Running Tests

```bash
npm test
```

Tests use a separate `statuswatch_test_db` database. All tables are truncated before each test via `tests/setup.js` for full isolation.

### Test coverage
- `tests/crud.test.js` — 14 unit tests covering CRUD across components, incidents, maintenance, and subscribers, including validation and 404/409 edge cases
- `tests/integration.test.js` — 7 integration tests covering subscriber notifications, the public status feed, and dashboard aggregation

---

## Key Differences from Python Version

| Concern          | Python (Flask)              | JavaScript (Express)           |
|------------------|--------------------------------|-----------------------------------|
| SQL placeholders | `%s`                          | `?`                               |
| Async model      | Synchronous                   | `async/await` with Promises       |
| DB library       | mysql-connector-python         | mysql2/promise                    |
| Connection pool  | Keyed dict of pools by DB name | Keyed object of pools by DB name |
| App factory      | `create_app(config)`           | `createApp(config)` (async)       |
| Testing          | pytest + truncate fixture       | Jest + Supertest + truncate helper|
| Entry point      | `python backend/app.py`        | `node backend/server.js`          |
| Dependencies     | requirements.txt               | package.json                      |

---

## Attributions

See `ATTRIBUTIONS.md` for a full list of libraries, learning resources, and AI assistance used.

All external resources are used in accordance with their respective licences.
Any code developed with GenAI assistance has been reviewed, understood, and modified
by the student prior to submission, as required by the DBS Academic Integrity Policy.
