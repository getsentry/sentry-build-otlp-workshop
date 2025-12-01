# Quick Start

## Prerequisites

- Node.js 18+
- PostgreSQL database (we'll use https://neon.tech for free cloud Postgres)
- [Free or paid Sentry account](https://sentry.io/signup/)

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

**Direct Mode:**

```bash
npm start
# or from root: npm run demo:direct
```

**Collector Mode:**

```bash
npm run collector:all
# or from root: npm run demo:collector
```

## Testing

```bash
# Products
curl http://localhost:3000/api/products

# Orders
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 2}], "paymentMethod": "credit_card"}'

# Load test
npm test
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
npm run collector:cleanup
```
