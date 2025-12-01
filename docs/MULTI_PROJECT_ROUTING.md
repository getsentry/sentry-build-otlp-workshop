# Multi-Project Routing with OTEL Collector

## The Challenge

Sentry has a **project-based architecture** where each project has its own OTLP endpoint. When using multiple microservices with an OTEL Collector, you may want each service's telemetry to go to a separate Sentry project for:

- **Team Ownership**: Different teams own different projects
- **Separate Retention/Sampling**: Different rules per service
- **Cost Management**: Track costs per service
- **Access Control**: Project-level permissions

## The Solution: Routing Connector

The OpenTelemetry Collector's **routing connector** evaluates resource attributes (like `service.name`) and routes telemetry to different pipelines, each with its own Sentry project exporter.

### Architecture

```
┌──────────────────┐  ┌──────────────────┐
│ Products Service │  │  Orders Service  │
│ service.name:    │  │ service.name:    │
│ products-service │  │ orders-service   │
└────────┬─────────┘  └─────────┬────────┘
         │                      │
         │ OTLP                 │ OTLP
         ▼                      ▼
    ┌────────────────────────────────┐
    │   OTEL Collector               │
    │   (Routing Connector)          │
    └────┬──────────────────┬────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Sentry Project │  │  Sentry Project │
│   (Products)    │  │    (Orders)     │
└─────────────────┘  └─────────────────┘
```

## Configuration

### 1. Services Set service.name

Each service sets a unique `service.name`:

**Products Service** (`instrument-otel-products.js`):

```javascript
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: "products-service",
});
```

**Orders Service** (`instrument-otel-orders.js`):

```javascript
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: "orders-service",
});
```

### 2. Collector Routes by service.name

**Routing Configuration** (`collector-config.yaml`):

```yaml
connectors:
  routing/traces:
    default_pipelines: [traces/orders]
    table:
      - statement: route() where attributes["service.name"] == "products-service"
        pipelines: [traces/products]
      - statement: route() where attributes["service.name"] == "orders-service"
        pipelines: [traces/orders]

exporters:
  otlphttp/products-traces:
    traces_endpoint: ${env:SENTRY_PRODUCTS_TRACES_ENDPOINT}
    headers:
      x-sentry-auth: ${env:SENTRY_PRODUCTS_AUTH}

  otlphttp/orders-traces:
    traces_endpoint: ${env:SENTRY_ORDERS_TRACES_ENDPOINT}
    headers:
      x-sentry-auth: ${env:SENTRY_ORDERS_AUTH}

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [routing/traces]

    traces/products:
      receivers: [routing/traces]
      exporters: [otlphttp/products-traces]

    traces/orders:
      receivers: [routing/traces]
      exporters: [otlphttp/orders-traces]
```

### 3. Environment Configuration

Each Sentry project needs its own credentials in `.env`:

```bash
# Products Service → Products Sentry Project
SENTRY_PRODUCTS_TRACES_ENDPOINT=https://o123.ingest.sentry.io/api/456/integration/otlp/v1/traces
SENTRY_PRODUCTS_LOGS_ENDPOINT=https://o123.ingest.sentry.io/api/456/integration/otlp/v1/logs
SENTRY_PRODUCTS_AUTH=sentry sentry_key=abc123,sentry_version=7

# Orders Service → Orders Sentry Project
SENTRY_ORDERS_TRACES_ENDPOINT=https://o123.ingest.sentry.io/api/789/integration/otlp/v1/traces
SENTRY_ORDERS_LOGS_ENDPOINT=https://o123.ingest.sentry.io/api/789/integration/otlp/v1/logs
SENTRY_ORDERS_AUTH=sentry sentry_key=def456,sentry_version=7
```

**Note the endpoints:**

- Include the full path with `/v1/traces` and `/v1/logs`
- Each project has a different PROJECT-ID (456, 789 in this example)
- Auth header uses format: `sentry sentry_key=KEY,sentry_version=7`

## Setup Steps

### 1. Create Sentry Projects

Create 2 separate Sentry projects:

- **Products Project** - for products-service telemetry
- **Orders Project** - for orders-service telemetry

### 2. Get OTLP Endpoints

For **each** project, get the OTLP configuration:

1. Go to Sentry → **Settings** → **Projects** → **[Your Project]**
2. Click **Client Keys (DSN)** in the sidebar
3. Scroll to **OTLP Configuration** section
4. Copy the **traces endpoint** (e.g., `https://o123.ingest.sentry.io/api/456/integration/otlp/v1/traces`)
5. Copy the **logs endpoint** (e.g., `https://o123.ingest.sentry.io/api/456/integration/otlp/v1/logs`)
6. Copy the **auth header** value (format: `sentry sentry_key=YOUR_KEY,sentry_version=7`)

### 3. Configure Environment

Edit `.env` and add all 6 environment variables (3 per project). See example in [../api/.env.example](../api/.env.example).

### 4. Run Collector Mode

```bash
cd api
npm run collector:all
```

This starts:

- OTEL Collector (with routing)
- Gateway service (port 3000)
- Products service (port 3001)
- Orders service (port 3002)

## Verification

> **💡 Tip:** You can use the **frontend UI** (http://localhost:5173) to browse products and create orders, which will generate traces across all services. The curl commands below are provided as an alternative for testing without the UI.

### Check Products Project

1. Send request:

   ```bash
   curl http://localhost:3000/api/products
   ```

2. Go to **Products Sentry project** → **Explore** → **Traces**

3. You should see:
   - Trace from `api-gateway` service
   - Spans from `products-service`
   - Database queries

### Check Orders Project

1. Send request:

   ```bash
   curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -d '{"userId":1,"items":[{"productId":1,"quantity":1}],"paymentMethod":"credit_card"}'
   ```

2. Go to **Orders Sentry project** → **Explore** → **Traces**

3. You should see:
   - Trace from `api-gateway` service
   - Spans from `orders-service`
   - Database operations, payment processing
