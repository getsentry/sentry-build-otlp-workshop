# Quick Start

## Prerequisites

- Node.js 18+
- PostgreSQL database (we'll use https://neon.tech for free cloud Postgres)
- [Free or paid Sentry account](https://sentry.io/signup/)

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Database

```bash
cp api/.env.example api/.env
npm run db:init    # Creates Neon database (may fail - see alternatives below)
npm run db:setup   # Initialize tables and seed data
```

**If `npm run db:init` fails**, use one of these alternatives:

- **Manual Neon**: Go to [console.neon.tech](https://console.neon.tech), create a project, copy the connection string to `api/.env` as `DATABASE_URL=...`
- **Docker**:
  ```bash
  docker run -d --name otel-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=otel_ecommerce -p 5432:5432 postgres:15
  ```
  Then add to `api/.env`: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/otel_ecommerce`

Then run `npm run db:setup`.

### 3. Configure Sentry

Choose which mode you want to run:

#### Option A: Direct Mode (1 Sentry Project)

Get your OTLP endpoint from Sentry: **Settings → Projects → [Your Project] → Client Keys → OTLP Configuration**

Edit `api/.env` and add:

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/logs
OTEL_EXPORTER_OTLP_LOGS_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY
```

#### Option B: Collector Mode (Multiple Projects with Per-Project DSNs)

Uses the routing connector to route telemetry based on `service.name`. Requires pre-created Sentry projects.

**Step 1: Create Sentry projects**

Create separate projects for each service (e.g., `products-project`, `orders-project`).

**Step 2: Get OTLP endpoints for each project**

For each project, go to **Settings → Projects → [Project] → Client Keys → OTLP Configuration**.

**Step 3: Configure environment**

Edit `api/.env` and add:

```bash
# Products project
SENTRY_PRODUCTS_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PRODUCTS-PROJECT-ID/integration/otlp/v1/traces
SENTRY_PRODUCTS_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PRODUCTS-PROJECT-ID/integration/otlp/v1/logs
SENTRY_PRODUCTS_AUTH=sentry sentry_key=PRODUCTS_PUBLIC_KEY,sentry_version=7

# Orders project
SENTRY_ORDERS_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/ORDERS-PROJECT-ID/integration/otlp/v1/traces
SENTRY_ORDERS_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/ORDERS-PROJECT-ID/integration/otlp/v1/logs
SENTRY_ORDERS_AUTH=sentry sentry_key=ORDERS_PUBLIC_KEY,sentry_version=7
```

The collector binary is auto-downloaded when you run `npm run demo:collector`.

#### Option C: Sentry Exporter Mode (Multi-Project with Auto-Routing)

The Sentry Exporter routes telemetry based on `service.name` and can auto-create Sentry projects.

**Step 1: Create a Custom Integration**

1. Go to **Settings → Developer Settings → Custom Integrations**
2. Click **Create New Integration** → choose **Internal Integration**
3. Set permissions:
   - **Project: Read** — required for endpoint resolution
   - **Project: Write** — required for `auto_create_projects`
4. Click **Save Changes**, then click **Create New Token**
5. Copy the token (starts with `sntrys_`) — save it securely, you won't see it again

**Step 2: Get your organization slug**

Find it in **Settings → General Settings**, or in your Sentry URL: `https://sentry.io/organizations/{org-slug}/`

**Step 3: Configure environment**

Edit `api/.env` and add:

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=sntrys_eyJ...
```

The collector binary is auto-downloaded when you run `npm run demo:sentry` — no build step required.

## Running

```bash
npm run demo:direct      # Direct Mode
npm run demo:collector   # Collector Mode (routing connector)
npm run demo:sentry      # Sentry Exporter Mode
```

All modes run on http://localhost:3000

## Testing

```bash
# Load test (creates products, orders, payments, errors)
npm run test:api

# Or test manually
curl http://localhost:3000/api/products
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"items":[{"productId":1,"quantity":1}],"paymentMethod":"credit_card"}'
```

View traces in Sentry: **Explore → Traces**

In Sentry Exporter mode, you'll see separate projects for each service:

- `api-gateway`
- `products-service`
- `orders-service`

## Troubleshooting

**No traces in Sentry**

- Direct mode: Verify OTLP endpoint and auth header
- Collector mode: Check `npm run collector:logs` for errors
- Sentry Exporter mode: Check `npm run sentry:logs` for errors

**Collector won't start (Collector mode)**

- Verify `SENTRY_PRODUCTS_*` and `SENTRY_ORDERS_*` env vars are set
- Check health: `npm run collector:health`

**Collector won't start (Sentry Exporter mode)**

- Verify `SENTRY_ORG_SLUG` and `SENTRY_AUTH_TOKEN` are set
- Check health: `npm run sentry:health`
- View logs: `npm run sentry:logs`

**Database connection error**

- Ensure `DATABASE_URL` includes `?sslmode=require`

**Port conflicts**

```bash
npm run collector:cleanup
```

## Useful Commands

| Command                     | Description                                |
| --------------------------- | ------------------------------------------ |
| `npm run demo:direct`       | Direct mode                                |
| `npm run demo:collector`    | Collector mode (routing connector)         |
| `npm run demo:sentry`       | Sentry Exporter mode                       |
| `npm run collector:logs`    | View collector logs (Collector mode)       |
| `npm run sentry:logs`       | View collector logs (Sentry Exporter mode) |
| `npm run collector:health`  | Check collector health                     |
| `npm run collector:cleanup` | Kill services on ports 3000-3002           |
| `npm run test:api`          | Run load tests                             |
