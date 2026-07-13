# Attributions

This file documents all external resources, libraries, and assistance used in the JmZOps project.

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
- Designing the simulated notification mechanism (persisting to a `notifications` table in place of real email sending, since no email provider/API key is used in this academic project)
- Writing the some part of the applicatication test fixture and test structure
- Drafting the README.md and this ATTRIBUTIONS.md

**All AI-assisted code was:**
- Reviewed and understood by the student before inclusion
- Modified and adapted to fit the specific project requirements
- Committed incrementally alongside original student-written code

In accordance with the **DBS Generative AI Guidelines**, this assistance is fully disclosed here and acknowledged in the repository commit history. The submitted work demonstrates the student's own understanding and has been adapted beyond the AI-generated scaffolding.


---

## Code Patterns & Conventions Referenced

| Pattern                              | Source / Inspiration                                                  |
|--------------------------------------|-----------------------------------------------------------------------|
| Express route modularisation         | Express.js official routing guide — https://expressjs.com/en/guide/routing.html |
| mysql2 connection pool pattern       | mysql2 official examples — https://github.com/sidorares/node-mysql2/tree/master/examples |
| App factory for testability          | Modelled on the Python version's `create_app()` pattern (Flask documentation) |
| Jest + Supertest test client pattern | Supertest README examples + Jest documentation                        |
| Junction tables for many-to-many     | MySQL 8 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/example-many-to-many.html |

---

## Summary

All third-party code, libraries, and AI assistance used in this project are
attributed above. No code has been plagiarised or submitted without
acknowledgement. All licences (MIT, BSD) permit use in student projects
without restriction, provided attribution is given — which this file provides.

