# BizFlow API

**A multi-tenant field service API for customer records, service requests and technician assignments.**

BizFlow keeps service work within a company workspace: managers organize customers and requests, assign technicians and follow status history. The companion [React frontend](https://github.com/yusufemredagli/bizflow-frontend) provides the operational interface.

## Features

- Company-scoped access with OWNER, MANAGER and TECHNICIAN roles.
- JWT authentication with current membership checks.
- Customers, service requests, assignments and completion workflows.
- Request history and transactional audit records.
- Authorized attachment upload and retrieval.
- Dashboard summary and activity endpoints.

## Stack and structure

Node.js · Express · Prisma · MySQL/MariaDB adapter · Zod · JWT

`src/` contains routes, middleware, controllers and services; `prisma/` holds the schema and migrations; `tests/` contains regression tests. `server.js` starts the HTTP server.

## Local setup

```bash
git clone https://github.com/yusufemredagli/bizflow-backend.git
cd bizflow-backend
npm ci --ignore-scripts
npx prisma generate
```

Install scripts are skipped here to avoid the existing optional Prisma skills-sync hook. Generate the client explicitly as shown.

Configure a local, ignored environment file without committing credentials:

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Your local MySQL database connection URL |
| JWT_SECRET | A strong, randomly generated signing secret; production requires at least 32 bytes |
| FRONTEND_URL | Exact allowed frontend origin, using Vite's actual address |
| PORT | API port; defaults to 3000 |
| TRUST_PROXY_HOPS | Trusted proxy count when applicable |

Create a dedicated local database, review `prisma/migrations`, then apply the existing migrations **only to that local database**:

```bash
npx prisma migrate deploy
npm start
```

No seed script is provided. Do not point setup or migration commands at a production database. Swagger is available at `/api-docs`, but route annotations are incomplete.

## Tests

```bash
npm test
```

The documentation review on 11 November 2026 used Node.js 25.1.0: **20 tests passed, 0 failed, 0 skipped** after explicit Prisma client generation. This is not Node 24 validation.

The tests cover authorization boundaries, workflow guards and attachment HTTP flows using Prisma test doubles. They do not verify real database migrations or isolation. There is no separate build script: the application runs JavaScript directly.

## Demo and screenshots

No hosted demo or screenshots are included in this repository. Run this API together with the [frontend](https://github.com/yusufemredagli/bizflow-frontend) for local exploration.

## Known limits

See [the existing production review](docs/production-review.md) for deployment considerations and earlier checks. It is a dated review, not a current production readiness claim. Items include process-local rate limiting, local upload storage, database field-length mismatches and database TLS configuration.
