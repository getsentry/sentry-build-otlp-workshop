# Quick Start

## Prerequisites

- Node.js 18+
- PostgreSQL database (recommend https://neon.tech for free cloud Postgres)
- Sentry account with OTLP enabled

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

**Option A: Auto-setup with neondb (Recommended)**

```bash
cp .env.example .env
npx neondb -y  # Creates Neon database and adds DATABASE_URL to .env
```

**Option B: Manual setup**

```bash
cp .env.example .env
# Add your DATABASE_URL to .env
```

### 3. Initialize Database

```bash
npm run db:setup
```

Creates tables and seeds sample product data.

### 4. Configure Sentry

Choose which mode you want to run:

#### Option A: Direct Mode (Simple - 1 Sentry Project)

Get your OTLP endpoint from Sentry: **Settings → Projects → [Your Project] → Client Keys → OTLP Configuration**

Edit `.env` and add:

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY
```

#### Option B: Collector Mode (Advanced - 2 Sentry Projects)

1. Create **2 Sentry projects**: Products and Orders
2. Get OTLP endpoints for **both** projects
3. Edit `.env` and add:

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

### Direct Mode (Single Service)

Single monolithic Express API on port 3000:

```bash
npm start
```

You should see:
```
📡 Mode: DIRECT
📡 Server listening on port 3000
```

### Collector Mode (Microservices)

Gateway + Products + Orders microservices with OTEL Collector routing:

```bash
npm run collector:all
```

This starts 4 processes:
- **OTEL Collector** (ports 4317, 4318)
- **Gateway** on port 3000
- **Products Service** on port 3001
- **Orders Service** on port 3002

You should see output from all services.

## Testing

Both modes use the same port 3000 for the API:

```bash
# Test products endpoint
curl http://localhost:3000/api/products

# Test orders endpoint
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 2}], "paymentMethod": "credit_card"}'

# Load test (generates multiple traces)
npm test
```

## Viewing in Sentry

Go to your Sentry project(s) → **Explore** → **Traces**

**Direct Mode:** All traces in one project

**Collector Mode:**
- Products traces in Products project
- Orders traces in Orders project

## Troubleshooting

**No traces in Sentry**
- Verify OTLP endpoint URL is correct
- Check Sentry public key in headers
- Look for errors in console output

**Database connection error**
- Check `DATABASE_URL` includes `?sslmode=require`
- Verify database is accessible

**Port already in use (collector mode)**
```bash
npm run collector:cleanup  # Kills processes on ports 3000-3002
```

## What's the Difference?

**Direct Mode:**
- ✅ Simple setup (1 Sentry project)
- ✅ Single monolithic service
- 📊 All telemetry in one place

**Collector Mode:**
- ⚙️ Requires 2 Sentry projects
- 🏗️ Microservices architecture (Gateway + Products + Orders)
- 🎯 Demonstrates multi-project routing workaround
- 📊 Each service's data isolated in separate Sentry projects

## Next Steps

See [README.md](README.md) for:
- API endpoints
- Manual instrumentation examples
- Error scenarios
- Development tips
