# Collector Mode Setup Guide

This guide walks you through setting up the collector mode demo with multiple Sentry projects.

## Overview

The collector mode demonstrates routing telemetry from multiple microservices to separate Sentry projects. You'll need to create **3 Sentry projects**:

1. **Products Project** - Receives telemetry from `products-service`
2. **Orders Project** - Receives telemetry from `orders-service`
3. **Default Project** - Receives telemetry from any other services (fallback)

## Important: DSN vs OTLP Endpoints

**Note:** We're using **OTLP endpoints**, NOT DSNs.

- **DSN** - Used by Sentry SDK (frontend in our case)
- **OTLP Endpoint** - Used by OpenTelemetry SDK (backend in our case)

They are **different URLs** from the same project!

## Step 1: Create Three Sentry Projects

1. Go to your Sentry organization
2. Create three new projects:
   - Name: `otel-products` (or similar)
   - Platform: Choose "Node.js" or "Other"
   - Name: `otel-orders`
   - Platform: Choose "Node.js" or "Other"
   - Name: `otel-default`
   - Platform: Choose "Node.js" or "Other"

## Step 2: Get OTLP Configuration for Each Project

For **each of the 3 projects**, do the following:

### 2.1 Navigate to OTLP Settings

1. Go to **Settings** → **Projects** → **[Your Project]**
2. Click on **Client Keys (DSN)** in the left sidebar
3. Click on the DSN key (usually "Default")
4. Scroll down to find the **"OTLP Configuration"** section

### 2.2 Copy the Configuration

You'll see two pieces of information:

**Endpoint URL** (looks like):
```
https://o<ORG-ID>.ingest.us.sentry.io/api/<PROJECT-ID>/integration/otlp
```

**Auth Header** (looks like):
```
sentry_key=<YOUR-PUBLIC-KEY>,sentry_version=7
```

### 2.3 Important Notes

- The endpoint URL should **NOT** have `/v1/traces` or `/v1/logs` at the end
- The collector will add those paths automatically
- Each project has a different `<PROJECT-ID>` in the URL
- The auth header contains your project's public key

## Step 3: Configure Your Environment

Edit your `.env` file with the OTLP configuration from all 3 projects:

```bash
# Products Service → Products Sentry Project
SENTRY_PRODUCTS_OTLP_ENDPOINT=https://o<ORG-ID>.ingest.us.sentry.io/api/<PRODUCTS-PROJECT-ID>/integration/otlp
SENTRY_PRODUCTS_AUTH=sentry sentry_key=<PRODUCTS-PUBLIC-KEY>,sentry_version=7

# Orders Service → Orders Sentry Project
SENTRY_ORDERS_OTLP_ENDPOINT=https://o<ORG-ID>.ingest.us.sentry.io/api/<ORDERS-PROJECT-ID>/integration/otlp
SENTRY_ORDERS_AUTH=sentry sentry_key=<ORDERS-PUBLIC-KEY>,sentry_version=7

# Default/Fallback → Default Sentry Project
SENTRY_DEFAULT_OTLP_ENDPOINT=https://o<ORG-ID>.ingest.us.sentry.io/api/<DEFAULT-PROJECT-ID>/integration/otlp
SENTRY_DEFAULT_AUTH=sentry sentry_key=<DEFAULT-PUBLIC-KEY>,sentry_version=7

# Port configuration
PRODUCTS_PORT=3001
ORDERS_PORT=3002
```

### Example (with fake data):

```bash
SENTRY_PRODUCTS_OTLP_ENDPOINT=https://o123456.ingest.us.sentry.io/api/7890/integration/otlp
SENTRY_PRODUCTS_AUTH=sentry sentry_key=abc123def456,sentry_version=7

SENTRY_ORDERS_OTLP_ENDPOINT=https://o123456.ingest.us.sentry.io/api/7891/integration/otlp
SENTRY_ORDERS_AUTH=sentry sentry_key=ghi789jkl012,sentry_version=7

SENTRY_DEFAULT_OTLP_ENDPOINT=https://o123456.ingest.us.sentry.io/api/7892/integration/otlp
SENTRY_DEFAULT_AUTH=sentry sentry_key=mno345pqr678,sentry_version=7

PRODUCTS_PORT=3001
ORDERS_PORT=3002
```

Notice:
- Same `o123456` organization ID for all
- Different project IDs: `7890`, `7891`, `7892`
- Different public keys for each project

## Step 4: Start the Collector Mode

### Terminal 1: Start the Collector

```bash
cd api
npm run collector:start
```

You should see:
```
🚀 Starting OpenTelemetry Collector (Multi-Project Routing)...
   Config: /path/to/collector-config.yaml
   Routes: service.name → Sentry Project
     - products-service → Products Project
     - orders-service → Orders Project
     - (other) → Default Project
✅ Collector started successfully
   PID: 12345
   HTTP: http://localhost:4318
   gRPC: http://localhost:4317
   Health: http://localhost:13133

📋 Next steps:
   1. Start products service: npm run collector:products
   2. Start orders service: npm run collector:orders
```

### Terminal 2: Start Products Service

```bash
cd api
npm run collector:products
```

You should see:
```
📡 Mode: MULTI-SERVICE (via COLLECTOR)
📡 Service: products-service
📡 Exporting to: http://localhost:4318
🔭 OpenTelemetry instrumentation initialized
📊 Service: products-service

🛍️  Products Service
📡 Server listening on port 3001
```

### Terminal 3: Start Orders Service

```bash
cd api
npm run collector:orders
```

You should see:
```
📡 Mode: MULTI-SERVICE (via COLLECTOR)
📡 Service: orders-service
📡 Exporting to: http://localhost:4318
🔭 OpenTelemetry instrumentation initialized
📊 Service: orders-service

📦 Orders Service
📡 Server listening on port 3002
```

## Step 5: Generate Test Traffic

### Test Products Service

```bash
curl http://localhost:3001/api/products

# Multiple requests
for i in {1..10}; do curl http://localhost:3001/api/products; done
```

### Test Orders Service

```bash
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "items": [{"productId": 1, "quantity": 2}],
    "paymentMethod": "credit_card"
  }'

# Multiple requests
for i in {1..5}; do
  curl -X POST http://localhost:3002/api/orders \
    -H "Content-Type: application/json" \
    -d '{"userId": 1, "items": [{"productId": 1, "quantity": 2}], "paymentMethod": "credit_card"}'
done
```

## Step 6: Verify in Sentry

### Check Products Project

1. Go to your **otel-products** project in Sentry
2. Navigate to **Explore** → **Traces**
3. You should see traces with:
   - Service name: `products-service`
   - Operations: `GET /api/products`, database queries, etc.

### Check Orders Project

1. Go to your **otel-orders** project in Sentry
2. Navigate to **Explore** → **Traces**
3. You should see traces with:
   - Service name: `orders-service`
   - Operations: `POST /api/orders`, payment processing, inventory, etc.

### Check Default Project

1. Go to your **otel-default** project in Sentry
2. This should be **empty** (no traces) since all services matched routing rules
3. This project would receive data from any service that doesn't match `products-service` or `orders-service`

## Step 7: Understanding the Routing

The OTEL collector is routing based on the `service.name` attribute:

```yaml
# From collector-config.yaml
connectors:
  routing:
    table:
      # Route products-service
      - context: resource
        statement: route() where attributes["service.name"] == "products-service"
        pipelines: [traces/products, logs/products]

      # Route orders-service
      - context: resource
        statement: route() where attributes["service.name"] == "orders-service"
        pipelines: [traces/orders, logs/orders]
```

Each pipeline has its own exporter to a different Sentry project:

```yaml
exporters:
  otlphttp/products:
    endpoint: ${env:SENTRY_PRODUCTS_OTLP_ENDPOINT}
    headers:
      x-sentry-auth: ${env:SENTRY_PRODUCTS_AUTH}

  otlphttp/orders:
    endpoint: ${env:SENTRY_ORDERS_OTLP_ENDPOINT}
    headers:
      x-sentry-auth: ${env:SENTRY_ORDERS_AUTH}
```

## Troubleshooting

### Collector won't start

Check the logs:
```bash
npm run collector:logs
```

Common issues:
- Missing environment variables (check all 6 are set)
- Invalid OTLP endpoint format
- Invalid auth header format

### Services start but no data in Sentry

1. Check collector is running:
   ```bash
   npm run collector:health
   ```

2. Check collector logs for errors:
   ```bash
   npm run collector:logs
   ```

3. Verify the service is sending to the collector:
   - Products service should show: `Exporting to: http://localhost:4318`
   - Orders service should show: `Exporting to: http://localhost:4318`

4. Check the OTLP endpoint URLs are correct (no `/v1/traces` at the end)

### Data going to wrong project

1. Check the `service.name` in the instrumentation files:
   - `instrument-otel-products.js` should have: `service.name: 'products-service'`
   - `instrument-otel-orders.js` should have: `service.name: 'orders-service'`

2. Check the routing rules in `collector-config.yaml` match these names

### Data in default project instead of specific project

This means the routing connector didn't match the service name:
- Verify the `service.name` in instrumentation files
- Check for typos in routing rules
- Look at collector logs for routing decisions

## Cleanup

Stop all services:

```bash
# Stop collector
npm run collector:stop

# Stop services (Ctrl+C in each terminal)
```

## What This Demonstrates

This setup demonstrates:

1. **The Constraint**: Sentry's project-based architecture - each project has its own OTLP endpoint
2. **The Challenge**: Multiple services sending to one collector need to be routed to different projects
3. **The Solution**: OTEL Collector's routing connector evaluates `service.name` and routes to appropriate pipelines
4. **The Result**: Clean separation of telemetry data per service in separate Sentry projects

Each team could own their own Sentry project (products team owns products project, orders team owns orders project) with different:
- Sampling rates
- Retention policies
- Access controls
- Alerting rules
- Quota/cost management
