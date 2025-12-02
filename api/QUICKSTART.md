# Quick Start

## Prerequisites

- Node.js 18+
- PostgreSQL database (we'll use https://neon.tech for free cloud Postgres)
- [Free or paid Sentry account](https://sentry.io/signup/)

## Setup

### 1. Install Dependencies

```bash
# From root
npm run install:all

# Or from api directory
npm install
```

### 2. Configure Database

```bash
# From root
cp api/.env.example api/.env
npm run db:init    # Creates Neon database
npm run db:setup   # Initialize tables and seed data

# Or from api directory
cp .env.example .env
npx neondb -y
npm run db:setup
```

### 3. Configure Sentry

Choose which mode you want to run:

#### Option A: Direct Mode (Simple - 1 Sentry Project)

Get your OTLP endpoint from Sentry: **Settings → Projects → [Your Project] → Client Keys → OTLP Configuration**

Edit `api/.env` and add:

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY
```

#### Option B: Collector Mode (Advanced - 2 Sentry Projects)

1. Create **2 Sentry projects**: Products and Orders
2. Get OTLP endpoints for **both** projects
3. Edit `api/.env` and add:

```bash
# Products Project
SENTRY_PRODUCTS_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PRODUCTS-PROJECT-ID/integration/otlp/v1/traces
SENTRY_PRODUCTS_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PRODUCTS-PROJECT-ID/integration/otlp/v1/logs
SENTRY_PRODUCTS_AUTH=sentry sentry_key=PRODUCTS_PUBLIC_KEY,sentry_version=7

# Orders Project
SENTRY_ORDERS_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/ORDERS-PROJECT-ID/integration/otlp/v1/traces
SENTRY_ORDERS_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/ORDERS-PROJECT-ID/integration/otlp/v1/logs
SENTRY_ORDERS_AUTH=sentry sentry_key=ORDERS_PUBLIC_KEY,sentry_version=7
```

See [../docs/MULTI_PROJECT_ROUTING.md](../docs/MULTI_PROJECT_ROUTING.md) for details.

## Running

**Direct Mode:**

```bash
# From root
npm run demo:direct

# Or from api directory
npm start
```

**Collector Mode:**

```bash
# From root
npm run demo:collector

# Or from api directory
npm run collector:all
```

## Testing

```bash
# Load test (from root - recommended)
npm run test:api

# Or from api directory
npm test

# Or test manually with curl
curl http://localhost:3000/api/products
```

View traces in Sentry: **Explore** → **Traces**

## Troubleshooting

**No traces in Sentry**

- Verify OTLP endpoint and auth header
- Check console for errors

**Database connection error**

- Ensure `DATABASE_URL` includes `?sslmode=require`

**Port conflicts (collector mode)**

```bash
# From root
npm run collector:cleanup

# Or from api directory
npm run collector:cleanup
```
