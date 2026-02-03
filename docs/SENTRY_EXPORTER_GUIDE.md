# Sentry Exporter Setup Guide

This guide walks you through setting up the Sentry Exporter mode for multi-project routing.

> **Note:** This configuration requires `otelcol-contrib` **v0.145.0 or later**. The new Sentry exporter with `org_slug`/`auth_token` support was merged to main and will be included in v0.145.0+. Check [releases](https://github.com/open-telemetry/opentelemetry-collector-releases/releases) for availability.

## Overview

The Sentry Exporter routes telemetry from multiple services to separate Sentry projects based on `service.name`. Unlike the routing connector approach, it uses a single org-level auth token and can auto-create projects.

**Services in this demo:**

- `api-gateway` (port 3000) → creates `api-gateway` project
- `products-service` (port 3001) → creates `products-service` project
- `orders-service` (port 3002) → creates `orders-service` project

---

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd otel-ecommerce
npm run install:all
```

### Step 2: Set Up Database

```bash
cp api/.env.example api/.env
npm run db:init      # Attempts to create Neon instant database
npm run db:setup     # Seeds tables
```

**If `npm run db:init` fails** (Neon's instant database API can be unreliable), use one of these alternatives:

**Option A: Create Neon database manually**

1. Go to [console.neon.tech](https://console.neon.tech) and sign up
2. Create a project → copy the connection string
3. Add to `api/.env`: `DATABASE_URL=postgresql://...`

**Option B: Use Docker for local Postgres**

```bash
docker run -d --name otel-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=otel_ecommerce \
  -p 5432:5432 postgres:15
```

Add to `api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/otel_ecommerce
```

Then run `npm run db:setup` to seed the tables.

### Step 3: Create Sentry Custom Integration

1. Go to [sentry.io](https://sentry.io) and log in
2. Navigate to **Settings → Developer Settings → Custom Integrations**
3. Click **Create New Integration**
4. Choose **Internal Integration** (not Public)
5. Give it a name (e.g., "OTEL Collector")
6. Set permissions:
   - **Project: Read** — required
   - **Project: Write** — required for auto_create_projects
   - **Team: Read** — required for auto_create_projects (to assign new projects to a team)
7. Click **Save Changes**
8. After saving, click **Create New Token**
9. Copy the token — you won't be able to see it again

### Step 4: Get Your Organization Slug

Find it in one of these places:

- **Settings → General Settings** → Organization Slug
- Your Sentry URL: `https://sentry.io/organizations/{org-slug}/`

### Step 5: Configure Environment

Edit `api/.env` and add:

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=sntrys_eyJ...
```

The collector binary (`otelcol-contrib`) is auto-downloaded when you run the next step. No build step required — the Sentry Exporter is included in the standard [otelcol-contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/sentryexporter) distribution.

### Step 6: Run

```bash
npm run demo:sentry
```

This starts:

- OpenTelemetry Collector with Sentry Exporter
- API Gateway (port 3000)
- Products Service (port 3001)
- Orders Service (port 3002)

### Step 7: Test

```bash
# Get products
curl http://localhost:3000/api/products

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"items":[{"productId":1,"quantity":1}],"paymentMethod":"credit_card"}'
```

### Step 8: View in Sentry

1. Go to your Sentry organization
2. You should see new projects: `api-gateway`, `products-service`, `orders-service`
3. Navigate to **Explore → Traces** in any project
4. Traces will show parent-child relationships across services

---

## Useful Commands

| Command                     | Description                             |
| --------------------------- | --------------------------------------- |
| `npm run demo:sentry`       | Start all services with Sentry Exporter |
| `npm run sentry:start`      | Start only the collector                |
| `npm run sentry:stop`       | Stop the collector                      |
| `npm run sentry:logs`       | View collector logs                     |
| `npm run sentry:health`     | Check collector health endpoint         |
| `npm run collector:cleanup` | Kill all services on ports 3000-3002    |
| `npm run test:api`          | Run load tests                          |

---

## Friction Points

### 1. First Batch of Data May Be Dropped

**Issue:** When `auto_create_projects: true` is enabled, project creation is asynchronous. The first batch of telemetry for a new project may be dropped while provisioning completes.

**Impact:** Initial traces/logs might not appear.

**Workaround:**

- Send a few test requests before your actual workload
- Or pre-create projects in Sentry manually

---

### 2. Project Slugs Must Be Valid

**Issue:** The `service.name` becomes the project slug. Project slugs have restrictions:

- Lowercase letters, numbers, hyphens only
- No underscores or special characters
- Max 50 characters

**Impact:** Service names like `orders_service` or `OrdersService` will fail.

**Current service names (valid):**

- `api-gateway` ✓
- `products-service` ✓
- `orders-service` ✓

---

### 3. Custom Integration Token Permissions

**Issue:** The auth token needs `Project: Read`, `Project: Write`, AND `Team: Read` scopes for auto-creation to work.

**Impact:**

- Without `Project: Write`: Cannot create new projects
- Without `Team: Read`: Cannot find a team to assign new projects to

**Symptoms:**

- 403 errors in collector logs for missing projects
- "no team available for creating project" errors

---

### 4. Single Organization Per Exporter

**Issue:** Each Sentry Exporter instance routes to one organization only.

**Impact:** Multi-org setups require multiple collector instances.

**Workaround:** Deploy separate collectors for each org, or use the routing connector approach.

---

### 5. Deleted Projects Cause Errors

**Issue:** If you delete a Sentry project while the collector is running, it will continue trying to send data there until its internal cache expires.

**Impact:** 403 errors until cache eviction (time varies).

**Workaround:** Restart the collector after deleting projects.

---

### 6. No Metrics Support Yet

**Issue:** The Sentry Exporter currently supports traces and logs only. Metrics pipeline is not implemented.

**Impact:** If you have a metrics pipeline configured, you need a separate exporter for metrics.

---

### 7. Rate Limiting Visibility

**Issue:** When Sentry rate-limits your data, the exporter handles it automatically but logs may not clearly indicate which project is being throttled.

**Impact:** Debugging rate limit issues requires checking Sentry's rate limit headers.

---

### 8. Database Auto-Provisioning Can Fail

**Issue:** The `npm run db:init` command uses Neon's instant database API (`neon.new`), which can return 500 errors or be rate-limited.

**Impact:** First-time setup may fail with "Failed to create database" error.

**Workarounds:**

- Create a Neon database manually at [console.neon.tech](https://console.neon.tech)
- Use Docker: `docker run -d --name otel-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=otel_ecommerce -p 5432:5432 postgres:15`
- Use any existing PostgreSQL instance

---

## Troubleshooting

### Collector won't start

```bash
# Check environment variables
grep SENTRY api/.env

# View logs
npm run sentry:logs

# Check health
npm run sentry:health
```

### No data in Sentry

1. Check collector health: `npm run sentry:health`
2. Check logs for errors: `npm run sentry:logs`
3. Verify org slug and token are correct
4. Ensure token has Project: Read, Project: Write, and Team: Read permissions

### Projects not being created

1. Verify token has `Project: Write` and `Team: Read` permissions
2. Check logs for 403 errors or "no team available" errors
3. Verify service names are valid project slugs (lowercase, hyphens only)

### Port conflicts

```bash
npm run collector:cleanup
```

---

## Configuration Reference

The collector config is at `api/collector-config-sentry.yaml`:

```yaml
exporters:
  sentry:
    url: "https://sentry.io"
    org_slug: "${env:SENTRY_ORG_SLUG}"
    auth_token: "${env:SENTRY_AUTH_TOKEN}"
    auto_create_projects: true
    routing:
      project_from_attribute: "service.name"
```

### Optional: Custom Project Mapping

If your service names don't match desired project slugs:

```yaml
exporters:
  sentry:
    # ... required fields
    routing:
      attribute_to_project_mapping:
        orders-service: ecommerce-orders
        products-service: ecommerce-products
        api-gateway: ecommerce-gateway
```
